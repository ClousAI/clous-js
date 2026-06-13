# @clous/sdk

The official **TypeScript / Node** SDK for the [Clous](https://clous.ai) SEC/EDGAR API — entity-resolved SEC filings, ownership, financials, fund holdings, governance, enforcement, and a live business-change **events & monitors** feed, for humans and AI agents.

- Fully typed: params and the response envelope for every endpoint.
- **Auto-pagination** via async iterators (`for await ... of`).
- Typed errors with request ids; automatic 429/5xx retries with backoff; timeouts.
- Zero runtime dependencies — uses the global `fetch` (Node 18+).
- ESM + CommonJS builds.
- An **OpenAI-compatible** chat endpoint (`model: "clous"`).

## Install

```bash
npm install @clous/sdk
```

Requires Node 18+ (for global `fetch`).

## Quickstart

```ts
import { Clous } from "@clous/sdk";

// apiKey defaults to process.env.CLOUS_API_KEY
const clous = new Clous({ apiKey: "clous_live_..." });

// Search the EDGAR filing index.
const { data } = await clous.filings.search({ q: "NVIDIA", form_type: "8-K", limit: 5 });
for (const filing of data) console.log(filing);

// All XBRL facts for one company (Apple), filtered to revenue.
const revenue = await clous.financials.get("0000320193", { concept: "Revenues" });

// Grounded, cited answer over the filings.
const answer = await clous.answer({ q: "What did NVIDIA most recently disclose?", ticker: "NVDA" });
console.log(answer.data[0]);
```

## Authentication

Pass `apiKey` to the constructor, or set the `CLOUS_API_KEY` environment variable. The key is sent as `Authorization: Bearer <key>`.

```ts
const clous = new Clous();                       // reads CLOUS_API_KEY
const clous = new Clous({ apiKey: "clous_live_..." });
const clous = new Clous({
  apiKey: "clous_live_...",
  baseURL: "https://api.clous.ai", // default
  timeoutMs: 60_000,               // default
  maxRetries: 2,                   // default; retries 429/5xx with backoff
});
```

## The response envelope

Every endpoint returns the same envelope. List endpoints carry a `page` block; single-resource lookups return a one-element `data` array.

```ts
interface Envelope<T> {
  data: T[];
  page: { limit: number; next_cursor: string | null; has_more: boolean };
  as_of?: string;
  source?: string;
  query_echo?: Record<string, unknown>;
  warnings?: string[];
}
```

### Token efficiency

Trim the payload with a field projection or a server-side output schema — useful when feeding results to an LLM:

```ts
await clous.filings.search({
  form_type: "4",
  fields: ["accession", "company_name", "filed_at"], // or "a,b.c"
});

await clous.entities.search({ ticker: "NVDA", output_schema: { name: true, cik: true } });
```

## Pagination

Pass `cursor` manually, or let the SDK stream every page for you:

```ts
// Manual:
let page = await clous.advisers.search({ state: "NY", limit: 100 });
while (page.page.has_more) {
  page = await clous.advisers.search({ state: "NY", limit: 100, cursor: page.page.next_cursor! });
}

// Auto — follows page.next_cursor to the end:
for await (const adviser of clous.advisers.iterate({ state: "NY", limit: 100 })) {
  console.log(adviser);
}
```

`iterate()` is available on every list resource (`filings`, `entities`, `insider`, `holdings`, `managers`, `advisers`, `events`, …).

## Errors

Non-2xx responses throw a typed error carrying the HTTP status, the stable Clous error code, the request id, and the parsed body:

```ts
import { Clous, ClousNotFoundError, ClousRateLimitError, ClousAPIError } from "@clous/sdk";

try {
  await clous.events.get("does-not-exist");
} catch (err) {
  if (err instanceof ClousNotFoundError) console.log(err.code);      // "not_found"
  if (err instanceof ClousRateLimitError) console.log(err.retryAfterSeconds);
  if (err instanceof ClousAPIError) console.log(err.status, err.requestId, err.body);
}
```

Error classes: `ClousBadRequestError` (400/422), `ClousAuthenticationError` (401), `ClousPermissionError` (403), `ClousNotFoundError` (404), `ClousRateLimitError` (429), `ClousServerError` (5xx), plus `ClousConnectionError` / `ClousTimeoutError` for transport failures. All extend `ClousAPIError` / `ClousError`.

The SDK automatically retries `429` and `5xx` responses (honoring `Retry-After`) up to `maxRetries` with exponential backoff + jitter.

## Monitoring & events

```ts
// Create a webhook endpoint and a monitor that fires on material NVDA events.
const ep = await clous.webhooks.endpoints.create({ url: "https://example.com/hook" });
const monitor = await clous.monitors.create({
  name: "NVIDIA material changes",
  target_type: "ticker",
  target_value: "NVDA",
  signals: ["sec.filing.new", "sec.8k.executive_change"],
  materiality: "medium",
  cadence: "1h",
  trigger_on_create: true,
  webhook_endpoint_id: (ep.data[0] as any).id,
});

await clous.monitors.pause((monitor.data[0] as any).id);
await clous.monitors.resume((monitor.data[0] as any).id);

// Read the events feed directly (what monitors match against).
for await (const event of clous.events.iterate({ ticker: "NVDA", importance: "high" })) {
  console.log(event);
}
```

## OpenAI-compatible

Clous exposes an OpenAI-compatible chat endpoint. Use the Clous SDK:

```ts
const completion = await clous.chat.completions.create({
  model: "clous",
  messages: [{ role: "user", content: "Summarize Tesla's most recent 8-K." }],
});
```

…or point the official `openai` client straight at Clous:

```ts
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.CLOUS_API_KEY, baseURL: "https://api.clous.ai/v1" });
const res = await openai.chat.completions.create({
  model: "clous",
  messages: [{ role: "user", content: "Summarize Tesla's most recent 8-K." }],
});
```

The answer is grounded strictly in SEC filing text; citations + a confidence basis ride along under a `clous` field on the completion.

## Client surface

| Namespace | Endpoint(s) |
| --- | --- |
| `clous.filings` | `/v1/filings`, `/v1/full-text`, and `/v1/filings/{accession}/{documents,extract,events,insiders,subsidiaries,crowdfunding,proxy-votes,briefing}` |
| `clous.entities` | `/v1/entities` |
| `clous.insider` | `/v1/insider` (+ `.form144()`) |
| `clous.ownership` | `/v1/ownership` |
| `clous.holdings` / `clous.managers` | `/v1/holdings`, `/v1/managers` |
| `clous.advisers` | `/v1/advisers` (+ `.get(crd)`) |
| `clous.iapdIndividuals` / `clous.brokerDealers` / `clous.formCrs` | `/v1/iapd-individuals`, `/v1/broker-dealers`, `/v1/form-crs` |
| `clous.financials` | `/v1/financials` (+ `.get(cik)`) |
| `clous.financialStatements` | `/v1/financial-statements` |
| `clous.funds` | `/v1/funds/holdings`, `/v1/funds/providers` |
| `clous.privateFunds` / `clous.privateFundStats` | `/v1/private-funds`, `/v1/private-fund-stats` |
| `clous.raises` / `clous.proxyOfficers` / `clous.board` / `clous.compensation` / `clous.patentGrants` | `/v1/raises`, `/v1/proxy/officers`, `/v1/board`, `/v1/compensation`, `/v1/uspto-patent-grants` |
| `clous.enforcement` / `clous.litigation` / `clous.ntLate` / `clous.tradingSuspensions` / `clous.whistleblower` / `clous.cyberIncidents` | `/v1/enforcement`, `/v1/litigation`, `/v1/nt-late`, `/v1/trading-suspensions`, `/v1/whistleblower`, `/v1/cyber-incidents` |
| `clous.events` | `/v1/events` (+ `.get(id)`) |
| `clous.monitors` | `/v1/monitors` CRUD (+ `.pause` / `.resume`) |
| `clous.webhooks` | `/v1/webhooks/endpoints`, `/v1/webhooks/deliveries` |
| `clous.meta` | `/v1/sources`, `/v1/account` |
| `clous.answer(...)` | `/v1/answer` |
| `clous.briefing(accession)` | `/v1/filings/{accession}/briefing` |
| `clous.chat.completions.create(...)` | `/v1/chat/completions` |

See [`examples/`](./examples) for runnable scripts.

## License

[MIT](./LICENSE)
