/**
 * Typed errors for the Clous SDK. Every non-2xx response is thrown as a
 * `ClousAPIError` (or a more specific subclass), carrying the HTTP status, the
 * stable Clous error code where present, the request id, and the parsed body.
 */

/** Base class for every error the SDK throws. */
export class ClousError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    // Restore prototype chain for instanceof across transpile targets.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when the request never completes (network failure / DNS / reset). */
export class ClousConnectionError extends ClousError {
  /** The underlying cause, if any. */
  cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

/** Thrown when a request exceeds the configured timeout. */
export class ClousTimeoutError extends ClousConnectionError {}

/** The stable Clous error-code set (see the API docs). */
export type ClousErrorCode =
  | "empty_result"
  | "entity_unresolved"
  | "not_found"
  | "invalid_param"
  | "rate_limited"
  | "ai_unavailable"
  | (string & {});

/** Thrown on any non-2xx HTTP response from the API. */
export class ClousAPIError extends ClousError {
  /** HTTP status code. */
  readonly status: number;
  /** Stable Clous error code, when the body carries one. */
  readonly code?: ClousErrorCode;
  /** Request id from the `x-request-id` response header, when present. */
  readonly requestId?: string;
  /** The parsed (or raw) response body. */
  readonly body?: unknown;
  /** Response headers. */
  readonly headers?: Record<string, string>;

  constructor(opts: {
    status: number;
    message: string;
    code?: ClousErrorCode;
    requestId?: string;
    body?: unknown;
    headers?: Record<string, string>;
  }) {
    super(opts.message);
    this.status = opts.status;
    this.code = opts.code;
    this.requestId = opts.requestId;
    this.body = opts.body;
    this.headers = opts.headers;
  }

  /** Build the right subclass for an HTTP status. */
  static from(opts: {
    status: number;
    code?: ClousErrorCode;
    message: string;
    requestId?: string;
    body?: unknown;
    headers?: Record<string, string>;
  }): ClousAPIError {
    const Ctor =
      opts.status === 400 || opts.status === 422
        ? ClousBadRequestError
        : opts.status === 401
          ? ClousAuthenticationError
          : opts.status === 403
            ? ClousPermissionError
            : opts.status === 404
              ? ClousNotFoundError
              : opts.status === 429
                ? ClousRateLimitError
                : opts.status >= 500
                  ? ClousServerError
                  : ClousAPIError;
    return new Ctor(opts);
  }
}

export class ClousBadRequestError extends ClousAPIError {}
export class ClousAuthenticationError extends ClousAPIError {}
export class ClousPermissionError extends ClousAPIError {}
export class ClousNotFoundError extends ClousAPIError {}
export class ClousServerError extends ClousAPIError {}

/** Thrown on HTTP 429 (throttled or credit balance exhausted). */
export class ClousRateLimitError extends ClousAPIError {
  /** Seconds to wait before retrying, from the `retry-after` header. */
  get retryAfterSeconds(): number | undefined {
    const v = this.headers?.["retry-after"];
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
}

/**
 * Pull a stable error code + human message out of a parsed Clous error body.
 * Handles both the `{ detail: { code, message } }` shape and the OpenAPI
 * `{ detail: [{ loc, msg, type }] }` (422) shape.
 */
export function parseErrorBody(
  body: unknown,
  status: number,
): { code?: ClousErrorCode; message: string } {
  if (body && typeof body === "object") {
    const detail = (body as Record<string, unknown>).detail;
    if (detail && typeof detail === "object" && !Array.isArray(detail)) {
      const d = detail as Record<string, unknown>;
      return {
        code: typeof d.code === "string" ? d.code : undefined,
        message:
          typeof d.message === "string" ? d.message : `HTTP ${status}`,
      };
    }
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as Record<string, unknown>;
      const loc = Array.isArray(first.loc) ? first.loc.join(".") : undefined;
      const msg = typeof first.msg === "string" ? first.msg : `HTTP ${status}`;
      return {
        code: "invalid_param",
        message: loc ? `${loc}: ${msg}` : msg,
      };
    }
    const topMsg = (body as Record<string, unknown>).message;
    if (typeof topMsg === "string") return { message: topMsg };
  }
  if (typeof body === "string" && body) {
    return { message: body.slice(0, 500) };
  }
  return { message: `HTTP ${status}` };
}
