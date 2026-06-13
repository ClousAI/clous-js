/**
 * The Clous HTTP transport: a small wrapper over global `fetch` that adds auth,
 * query serialization, the typed error model, timeouts, and 429/5xx retries
 * with exponential backoff. Zero runtime dependencies.
 */
import {
  ClousAPIError,
  ClousConnectionError,
  ClousTimeoutError,
  parseErrorBody,
} from "./errors.js";
import type { Envelope, ListParams, RequestOptions } from "./types.js";

export interface ClousOptions {
  /**
   * API key. Falls back to `process.env.CLOUS_API_KEY`. Sent as
   * `Authorization: Bearer <apiKey>`.
   */
  apiKey?: string;
  /** Base URL. Defaults to `https://api.clous.ai`. */
  baseURL?: string;
  /** Default per-request timeout in ms. Defaults to 60000. */
  timeoutMs?: number;
  /** Default max retries on 429/5xx. Defaults to 2. */
  maxRetries?: number;
  /** Extra headers merged onto every request. */
  defaultHeaders?: Record<string, string>;
  /** Override the fetch implementation (e.g. for testing). Defaults to global `fetch`. */
  fetch?: typeof fetch;
}

export type QueryValue =
  | string
  | number
  | boolean
  | string[]
  | Record<string, unknown>
  | undefined
  | null;

const VERSION = "0.1.0";

function envApiKey(): string | undefined {
  // Guarded so the SDK also works in non-Node runtimes.
  if (typeof process !== "undefined" && process.env) {
    return process.env.CLOUS_API_KEY;
  }
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Serialize a query value for the URL. Arrays → comma-joined; objects → JSON. */
function serializeQueryValue(v: Exclude<QueryValue, undefined | null>): string {
  if (Array.isArray(v)) return v.join(",");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export class HttpClient {
  readonly baseURL: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly defaultHeaders: Record<string, string>;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: ClousOptions = {}) {
    const apiKey = opts.apiKey ?? envApiKey();
    if (!apiKey) {
      throw new ClousAPIError({
        status: 0,
        code: "invalid_param",
        message:
          "Missing Clous API key. Pass `new Clous({ apiKey })` or set the CLOUS_API_KEY environment variable.",
      });
    }
    this.apiKey = apiKey;
    this.baseURL = (opts.baseURL ?? "https://api.clous.ai").replace(/\/+$/, "");
    this.timeoutMs = opts.timeoutMs ?? 60_000;
    this.maxRetries = opts.maxRetries ?? 2;
    this.defaultHeaders = opts.defaultHeaders ?? {};
    const f = opts.fetch ?? (globalThis.fetch as typeof fetch | undefined);
    if (!f) {
      throw new ClousAPIError({
        status: 0,
        message:
          "No global `fetch` found. Use Node 18+, or pass a `fetch` implementation to the Clous client.",
      });
    }
    this.fetchImpl = f;
  }

  private buildURL(path: string, query?: Record<string, QueryValue>): string {
    const url = new URL(this.baseURL + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, serializeQueryValue(v));
      }
    }
    return url.toString();
  }

  /** Core request with timeout + retry. Throws a typed error on non-2xx. */
  async request<T>(
    method: string,
    path: string,
    opts: {
      query?: Record<string, QueryValue>;
      body?: unknown;
      options?: RequestOptions;
    } = {},
  ): Promise<T> {
    const url = this.buildURL(path, opts.query);
    const maxRetries = opts.options?.maxRetries ?? this.maxRetries;
    const timeoutMs = opts.options?.timeoutMs ?? this.timeoutMs;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
      "User-Agent": `clous-js/${VERSION}`,
      ...this.defaultHeaders,
      ...opts.options?.headers,
    };
    const init: RequestInit = { method, headers };
    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }

    let attempt = 0;
    // attempt 0 is the first try; up to maxRetries additional attempts.
    for (;;) {
      const controller = new AbortController();
      const onAbort = () => controller.abort();
      if (opts.options?.signal) {
        if (opts.options.signal.aborted) controller.abort();
        else opts.options.signal.addEventListener("abort", onAbort, { once: true });
      }
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let res: Response;
      try {
        res = await this.fetchImpl(url, { ...init, signal: controller.signal });
      } catch (e) {
        clearTimeout(timer);
        opts.options?.signal?.removeEventListener("abort", onAbort);
        const aborted =
          (e as { name?: string })?.name === "AbortError" ||
          controller.signal.aborted;
        if (aborted && opts.options?.signal?.aborted) {
          // Caller-initiated cancellation: surface as-is, do not retry.
          throw e;
        }
        if (aborted) {
          if (attempt < maxRetries) {
            await sleep(backoffMs(attempt));
            attempt++;
            continue;
          }
          throw new ClousTimeoutError(
            `Request to ${path} timed out after ${timeoutMs}ms.`,
            e,
          );
        }
        // Network error — retry, then give up.
        if (attempt < maxRetries) {
          await sleep(backoffMs(attempt));
          attempt++;
          continue;
        }
        throw new ClousConnectionError(
          `Network error calling Clous (${path}): ${(e as Error).message}`,
          e,
        );
      } finally {
        clearTimeout(timer);
        opts.options?.signal?.removeEventListener("abort", onAbort);
      }

      const text = await res.text();
      let parsed: unknown = undefined;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }
      }

      if (res.ok) {
        return parsed as T;
      }

      // Retry on 429 / 5xx.
      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < maxRetries) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : backoffMs(attempt);
        await sleep(wait);
        attempt++;
        continue;
      }

      const { code, message } = parseErrorBody(parsed, res.status);
      throw ClousAPIError.from({
        status: res.status,
        code,
        message,
        requestId: res.headers.get("x-request-id") ?? undefined,
        body: parsed,
        headers: headersToObject(res.headers),
      });
    }
  }

  /** GET helper returning the full envelope. */
  get<T>(
    path: string,
    query?: Record<string, QueryValue>,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.request<Envelope<T>>("GET", path, { query, options });
  }

  /** POST helper returning the full envelope. */
  post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.request<Envelope<T>>("POST", path, { body, options });
  }

  /** PATCH helper returning the full envelope. */
  patch<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.request<Envelope<T>>("PATCH", path, { body, options });
  }

  /** DELETE helper returning the full envelope. */
  delete<T>(path: string, options?: RequestOptions): Promise<Envelope<T>> {
    return this.request<Envelope<T>>("DELETE", path, { options });
  }

  /**
   * Auto-paginating async iterator. Follows `page.next_cursor` until the API
   * reports `has_more: false`, yielding each record across every page.
   */
  async *paginate<T>(
    path: string,
    params: ListParams = {},
    options?: RequestOptions,
  ): AsyncGenerator<T, void, unknown> {
    let cursor = params.cursor;
    for (;;) {
      const query: Record<string, QueryValue> = { ...(params as Record<string, QueryValue>) };
      if (cursor) query.cursor = cursor;
      // Normalize the projection params for the wire.
      if (Array.isArray(query.fields)) query.fields = query.fields.join(",");
      const env = await this.get<T>(path, query, options);
      for (const row of env.data ?? []) yield row;
      if (!env.page?.has_more || !env.page?.next_cursor) return;
      cursor = env.page.next_cursor;
    }
  }
}

/** Exponential backoff with full jitter, capped at 8s. */
function backoffMs(attempt: number): number {
  const base = Math.min(8000, 500 * 2 ** attempt);
  return Math.floor(Math.random() * base);
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((v, k) => {
    out[k.toLowerCase()] = v;
  });
  return out;
}

/** Normalize ListParams for the wire (fields[] → "a,b"). */
export function normalizeListParams(
  params: ListParams = {},
): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = { ...(params as Record<string, QueryValue>) };
  if (Array.isArray(out.fields)) out.fields = (out.fields as string[]).join(",");
  return out;
}
