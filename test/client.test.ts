import { describe, it, expect, vi } from "vitest";
import {
  Clous,
  ClousAuthenticationError,
  ClousNotFoundError,
  ClousRateLimitError,
  ClousBadRequestError,
  type Envelope,
} from "../src/index.js";

/** Build a fake `fetch` that returns a JSON envelope with the given status. */
function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  const status = init.status ?? 200;
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

function envelope<T>(data: T[], page?: Partial<Envelope<T>["page"]>): Envelope<T> {
  return {
    data,
    page: { limit: 25, next_cursor: null, has_more: false, ...page },
    as_of: "2026-06-13T00:00:00Z",
    source: "test",
    query_echo: {},
    warnings: [],
  };
}

describe("Clous client", () => {
  it("sends auth header and serializes query params", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = new URL(typeof url === "string" ? url : url.toString());
      expect(u.pathname).toBe("/v1/filings");
      expect(u.searchParams.get("ticker")).toBe("NVDA");
      expect(u.searchParams.get("form_type")).toBe("8-K");
      expect(u.searchParams.get("limit")).toBe("5");
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer test_key");
      return jsonResponse(envelope([{ accession: "0001-23-456" }]));
    });

    const clous = new Clous({ apiKey: "test_key", fetch: fetchMock as unknown as typeof fetch });
    const res = await clous.filings.search({ ticker: "NVDA", form_type: "8-K", limit: 5 } as any);
    expect(res.data[0]).toEqual({ accession: "0001-23-456" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("serializes fields[] and output_schema", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const u = new URL(typeof url === "string" ? url : url.toString());
      expect(u.searchParams.get("fields")).toBe("accession,form_type");
      expect(u.searchParams.get("output_schema")).toBe(JSON.stringify({ a: 1 }));
      return jsonResponse(envelope([]));
    });
    const clous = new Clous({ apiKey: "k", fetch: fetchMock as unknown as typeof fetch });
    await clous.entities.search({ fields: ["accession", "form_type"], output_schema: { a: 1 } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("auto-paginates with iterate() following next_cursor", async () => {
    const calls: (string | null)[] = [];
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const u = new URL(typeof url === "string" ? url : url.toString());
      const cursor = u.searchParams.get("cursor");
      calls.push(cursor);
      if (!cursor) {
        return jsonResponse(envelope([{ id: 1 }, { id: 2 }], { next_cursor: "C2", has_more: true }));
      }
      return jsonResponse(envelope([{ id: 3 }], { next_cursor: null, has_more: false }));
    });

    const clous = new Clous({ apiKey: "k", fetch: fetchMock as unknown as typeof fetch });
    const ids: number[] = [];
    for await (const row of clous.events.iterate<{ id: number }>()) ids.push(row.id);
    expect(ids).toEqual([1, 2, 3]);
    expect(calls).toEqual([null, "C2"]);
  });

  it("throws typed errors with code and request id", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ detail: { code: "not_found", message: "No event x." } }, {
        status: 404,
        headers: { "x-request-id": "req_123" },
      }),
    );
    const clous = new Clous({ apiKey: "k", fetch: fetchMock as unknown as typeof fetch });
    await expect(clous.events.get("x")).rejects.toMatchObject({
      status: 404,
      code: "not_found",
      requestId: "req_123",
    });
    await expect(clous.events.get("x")).rejects.toBeInstanceOf(ClousNotFoundError);
  });

  it("maps 401 and 422 to typed subclasses", async () => {
    const auth = new Clous({ apiKey: "k", fetch: (async () =>
      jsonResponse({ detail: { code: "rate_limited", message: "no" } }, { status: 401 })) as any });
    await expect(auth.meta.account()).rejects.toBeInstanceOf(ClousAuthenticationError);

    const bad = new Clous({ apiKey: "k", fetch: (async () =>
      jsonResponse({ detail: [{ loc: ["query", "aum_min"], msg: "must be >= 0", type: "x" }] }, {
        status: 422,
      })) as any });
    await expect(bad.advisers.search({ aum_min: -1 })).rejects.toMatchObject({
      status: 422,
      code: "invalid_param",
    });
    await expect(bad.advisers.search({ aum_min: -1 })).rejects.toBeInstanceOf(ClousBadRequestError);
  });

  it("retries on 429 then succeeds", async () => {
    let n = 0;
    const fetchMock = vi.fn(async () => {
      n++;
      if (n === 1) {
        return jsonResponse({ detail: { code: "rate_limited", message: "slow down" } }, {
          status: 429,
          headers: { "retry-after": "0" },
        });
      }
      return jsonResponse(envelope([{ ok: true }]));
    });
    const clous = new Clous({ apiKey: "k", maxRetries: 2, fetch: fetchMock as unknown as typeof fetch });
    const res = await clous.managers.search();
    expect(res.data[0]).toEqual({ ok: true });
    expect(n).toBe(2);
  });

  it("gives up after maxRetries and throws ClousRateLimitError", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ detail: { code: "rate_limited", message: "no" } }, {
        status: 429,
        headers: { "retry-after": "0" },
      }),
    );
    const clous = new Clous({ apiKey: "k", maxRetries: 1, fetch: fetchMock as unknown as typeof fetch });
    await expect(clous.managers.search()).rejects.toBeInstanceOf(ClousRateLimitError);
    expect(fetchMock).toHaveBeenCalledTimes(2); // initial + 1 retry
  });

  it("builds correct paths for sub-resources and POST bodies", async () => {
    const seen: { method?: string; path: string; body?: unknown }[] = [];
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = new URL(typeof url === "string" ? url : url.toString());
      seen.push({ method: init?.method, path: u.pathname, body: init?.body ? JSON.parse(init.body as string) : undefined });
      return jsonResponse(envelope([{ id: "m1" }]));
    });
    const clous = new Clous({ apiKey: "k", fetch: fetchMock as unknown as typeof fetch });

    await clous.advisers.get("105958");
    await clous.financials.get("0000320193", { concept: "Revenues" });
    await clous.filings.briefing("0001-23-456");
    await clous.monitors.create({ name: "n", target_type: "ticker", target_value: "NVDA" });

    expect(seen[0]).toMatchObject({ method: "GET", path: "/v1/advisers/105958" });
    expect(seen[1]).toMatchObject({ method: "GET", path: "/v1/financials/0000320193" });
    expect(seen[2]).toMatchObject({ method: "GET", path: "/v1/filings/0001-23-456/briefing" });
    expect(seen[3]).toMatchObject({
      method: "POST",
      path: "/v1/monitors",
      body: { name: "n", target_type: "ticker", target_value: "NVDA" },
    });
  });

  it("answer() and chat completions hit the AI endpoints", async () => {
    const seen: { path: string; body?: any }[] = [];
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = new URL(typeof url === "string" ? url : url.toString());
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      seen.push({ path: u.pathname, body });
      if (u.pathname === "/v1/chat/completions") {
        return jsonResponse({ id: "cmpl_1", choices: [{ message: { content: "hi" } }] });
      }
      return jsonResponse(envelope([{ answer: "42" }]));
    });
    const clous = new Clous({ apiKey: "k", fetch: fetchMock as unknown as typeof fetch });

    const ans = await clous.answer({ q: "What did NVDA report?", ticker: "NVDA" });
    expect(ans.data[0]).toEqual({ answer: "42" });

    const cmpl = await clous.chat.completions.create({
      messages: [{ role: "user", content: "Summarize the latest 8-K for NVDA" }],
    });
    expect((cmpl as any).id).toBe("cmpl_1");
    expect(seen[0]).toMatchObject({ path: "/v1/answer", body: { q: "What did NVDA report?", ticker: "NVDA" } });
    expect(seen[1]!.path).toBe("/v1/chat/completions");
    expect(seen[1]!.body.model).toBe("clous");
  });

  it("throws synchronously when no API key is available", () => {
    const saved = process.env.CLOUS_API_KEY;
    delete process.env.CLOUS_API_KEY;
    try {
      expect(() => new Clous({ fetch: (async () => new Response()) as any })).toThrow(/Missing Clous API key/);
    } finally {
      if (saved !== undefined) process.env.CLOUS_API_KEY = saved;
    }
  });
});
