/**
 * @clousai/sdk — the official TypeScript/Node SDK for the Clous SEC/EDGAR API.
 *
 * ```ts
 * import { Clous } from "@clousai/sdk";
 * const clous = new Clous({ apiKey: process.env.CLOUS_API_KEY });
 * const { data } = await clous.filings.search({ ticker: "NVDA", form_type: "8-K" });
 * ```
 */
import { HttpClient, type ClousOptions } from "./client.js";
import { FilingsResource } from "./resources/filings.js";
import { EventsResource } from "./resources/events.js";
import { MonitorsResource } from "./resources/monitors.js";
import { WebhooksResource } from "./resources/webhooks.js";
import { SearchResource } from "./resources/search.js";
import {
  AdvisersResource,
  FinancialsResource,
  FundsResource,
  InsiderResource,
  MetaResource,
} from "./resources/specialized.js";
import type {
  AnswerParams,
  BoardSearchParams,
  BrokerDealerSearchParams,
  ChatCompletionParams,
  CompensationSearchParams,
  CyberIncidentSearchParams,
  EnforcementSearchParams,
  EntitySearchParams,
  Envelope,
  FinancialStatementsParams,
  FinancialsSearchParams,
  FormCrsSearchParams,
  FundHoldingsSearchParams,
  FundProvidersSearchParams,
  HoldingsSearchParams,
  IapdIndividualSearchParams,
  LitigationSearchParams,
  ManagerSearchParams,
  NtLateSearchParams,
  OwnershipSearchParams,
  PatentGrantSearchParams,
  PrivateFundSearchParams,
  PrivateFundStatsParams,
  ProxyOfficerSearchParams,
  RaiseSearchParams,
  RequestOptions,
  TradingSuspensionSearchParams,
  WhistleblowerSearchParams,
} from "./types.js";

export * from "./types.js";
export * from "./errors.js";
export { HttpClient } from "./client.js";
export type { ClousOptions } from "./client.js";
export { SearchResource } from "./resources/search.js";

/** The Clous API client. Construct once and reuse. */
export class Clous {
  /** Low-level HTTP client (escape hatch for raw requests). */
  readonly http: HttpClient;

  // ── Filings & search ──────────────────────────────────────────────────
  /** EDGAR filing index + per-filing extractions (documents, sections, briefing…). */
  readonly filings: FilingsResource;
  /** Company / CIK / ticker directory. `GET /v1/entities`. */
  readonly entities: SearchResource<EntitySearchParams>;

  // ── Ownership & insiders ──────────────────────────────────────────────
  /** Form 3/4/5 insider transactions (+ `.form144()`). */
  readonly insider: InsiderResource;
  /** 13D/13G beneficial ownership. `GET /v1/ownership`. */
  readonly ownership: SearchResource<OwnershipSearchParams>;

  // ── Holdings / managers / advisers ────────────────────────────────────
  /** 13F holdings (manager → positions). `GET /v1/holdings`. */
  readonly holdings: SearchResource<HoldingsSearchParams>;
  /** 13F institutional managers. `GET /v1/managers`. */
  readonly managers: SearchResource<ManagerSearchParams>;
  /** Form ADV advisers (+ `.get(crd)`). */
  readonly advisers: AdvisersResource;
  /** IAPD/BrokerCheck adviser representatives. `GET /v1/iapd-individuals`. */
  readonly iapdIndividuals: SearchResource<IapdIndividualSearchParams>;
  /** Registered broker-dealers (Form BD). `GET /v1/broker-dealers`. */
  readonly brokerDealers: SearchResource<BrokerDealerSearchParams>;
  /** Form CRS relationship summaries. `GET /v1/form-crs`. */
  readonly formCrs: SearchResource<FormCrsSearchParams>;

  // ── Financials ────────────────────────────────────────────────────────
  /** XBRL company facts: cross-company search + `.get(cik)`. */
  readonly financials: FinancialsResource;
  /** Standardized statement line items. `GET /v1/financial-statements`. */
  readonly financialStatements: SearchResource<FinancialStatementsParams>;

  // ── Funds ─────────────────────────────────────────────────────────────
  /** N-PORT holdings + N-CEN providers (`funds.holdings`, `funds.providers`). */
  readonly funds: FundsResource;
  /** Private funds (ADV Schedule D). `GET /v1/private-funds`. */
  readonly privateFunds: SearchResource<PrivateFundSearchParams>;
  /** Private fund statistics (Form PF). `GET /v1/private-fund-stats`. */
  readonly privateFundStats: SearchResource<PrivateFundStatsParams>;

  // ── Capital, governance & people ──────────────────────────────────────
  /** Form D private placements. `GET /v1/raises`. */
  readonly raises: SearchResource<RaiseSearchParams>;
  /** DEF 14A officers / directors. `GET /v1/proxy/officers`. */
  readonly proxyOfficers: SearchResource<ProxyOfficerSearchParams>;
  /** Directors & board members. `GET /v1/board`. */
  readonly board: SearchResource<BoardSearchParams>;
  /** Executive compensation. `GET /v1/compensation`. */
  readonly compensation: SearchResource<CompensationSearchParams>;
  /** USPTO patent grants. `GET /v1/uspto-patent-grants`. */
  readonly patentGrants: SearchResource<PatentGrantSearchParams>;

  // ── Enforcement / litigation / status ─────────────────────────────────
  /** SEC enforcement actions. `GET /v1/enforcement`. */
  readonly enforcement: SearchResource<EnforcementSearchParams>;
  /** SEC litigation releases. `GET /v1/litigation`. */
  readonly litigation: SearchResource<LitigationSearchParams>;
  /** Late-filing notifications (NT / 12b-25). `GET /v1/nt-late`. */
  readonly ntLate: SearchResource<NtLateSearchParams>;
  /** SEC trading suspensions. `GET /v1/trading-suspensions`. */
  readonly tradingSuspensions: SearchResource<TradingSuspensionSearchParams>;
  /** SEC whistleblower awards. `GET /v1/whistleblower`. */
  readonly whistleblower: SearchResource<WhistleblowerSearchParams>;
  /** 8-K Item 1.05 cybersecurity incidents. `GET /v1/cyber-incidents`. */
  readonly cyberIncidents: SearchResource<CyberIncidentSearchParams>;

  // ── Monitoring & meta ─────────────────────────────────────────────────
  /** Normalized business-change event feed. */
  readonly events: EventsResource;
  /** Standing watches (CRUD). */
  readonly monitors: MonitorsResource;
  /** Webhook endpoints + delivery log. */
  readonly webhooks: WebhooksResource;
  /** Dataset catalog/freshness + account plan/credits. */
  readonly meta: MetaResource;

  /** OpenAI-compatible chat completions over SEC data. */
  readonly chat: { completions: { create: Clous["chatCompletion"] } };

  constructor(options: ClousOptions = {}) {
    this.http = new HttpClient(options);

    this.filings = new FilingsResource(this.http);
    this.entities = new SearchResource(this.http, "/v1/entities");

    this.insider = new InsiderResource(this.http);
    this.ownership = new SearchResource(this.http, "/v1/ownership");

    this.holdings = new SearchResource(this.http, "/v1/holdings");
    this.managers = new SearchResource(this.http, "/v1/managers");
    this.advisers = new AdvisersResource(this.http);
    this.iapdIndividuals = new SearchResource(this.http, "/v1/iapd-individuals");
    this.brokerDealers = new SearchResource(this.http, "/v1/broker-dealers");
    this.formCrs = new SearchResource(this.http, "/v1/form-crs");

    this.financials = new FinancialsResource(this.http);
    this.financialStatements = new SearchResource(this.http, "/v1/financial-statements");

    this.funds = new FundsResource(this.http);
    this.privateFunds = new SearchResource(this.http, "/v1/private-funds");
    this.privateFundStats = new SearchResource(this.http, "/v1/private-fund-stats");

    this.raises = new SearchResource(this.http, "/v1/raises");
    this.proxyOfficers = new SearchResource(this.http, "/v1/proxy/officers");
    this.board = new SearchResource(this.http, "/v1/board");
    this.compensation = new SearchResource(this.http, "/v1/compensation");
    this.patentGrants = new SearchResource(this.http, "/v1/uspto-patent-grants");

    this.enforcement = new SearchResource(this.http, "/v1/enforcement");
    this.litigation = new SearchResource(this.http, "/v1/litigation");
    this.ntLate = new SearchResource(this.http, "/v1/nt-late");
    this.tradingSuspensions = new SearchResource(this.http, "/v1/trading-suspensions");
    this.whistleblower = new SearchResource(this.http, "/v1/whistleblower");
    this.cyberIncidents = new SearchResource(this.http, "/v1/cyber-incidents");

    this.events = new EventsResource(this.http);
    this.monitors = new MonitorsResource(this.http);
    this.webhooks = new WebhooksResource(this.http);
    this.meta = new MetaResource(this.http);

    this.chat = {
      completions: { create: this.chatCompletion.bind(this) },
    };
  }

  /**
   * Grounded, cited answer over SEC filings. `POST /v1/answer`. Scope with
   * `accession` (one filing), `cik`/`ticker` (an entity), or leave open.
   */
  answer<T = Record<string, unknown>>(
    params: AnswerParams,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.post<T>("/v1/answer", params, options);
  }

  /**
   * Convenience for an AI filing briefing — alias of
   * `clous.filings.briefing(accession)`. `GET /v1/filings/{accession}/briefing`.
   */
  briefing<T = Record<string, unknown>>(
    accession: string,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.filings.briefing<T>(accession, options);
  }

  /**
   * OpenAI-compatible chat completions over SEC data. `POST /v1/chat/completions`.
   * Also reachable as `clous.chat.completions.create(...)`. Returns the raw
   * OpenAI-shaped completion (not the envelope).
   */
  chatCompletion<T = Record<string, unknown>>(
    params: ChatCompletionParams,
    options?: RequestOptions,
  ): Promise<T> {
    return this.http.request<T>("POST", "/v1/chat/completions", {
      body: { model: "clous", ...params },
      options,
    });
  }
}

export default Clous;
