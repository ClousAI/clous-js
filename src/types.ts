/**
 * Shared types for the Clous SDK: the response envelope, pagination, common
 * query options, and the typed parameter shapes for each endpoint group.
 *
 * Derived from the live Clous API (https://api.clous.ai) — every list endpoint
 * returns the same envelope and uses cursor pagination.
 */

/** Pagination block present on every Clous response. */
export interface Page {
  /** The page size that was applied (1–100, default 25). */
  limit: number;
  /** Opaque token for the next page, or `null` on the last page. */
  next_cursor: string | null;
  /** `true` when another page exists. */
  has_more: boolean;
}

/**
 * The standard Clous response envelope. Every endpoint wraps its payload here.
 * `T` is the shape of each record in `data`.
 */
export interface Envelope<T = Record<string, unknown>> {
  /** The records for this page. */
  data: T[];
  /** Pagination block. */
  page: Page;
  /** Snapshot time for the data, ISO-8601. */
  as_of?: string;
  /** Human-readable provenance string, e.g. "SEC EDGAR — Form ADV". */
  source?: string;
  /** Echo of the typed parameters Clous actually applied. */
  query_echo?: Record<string, unknown>;
  /** Non-fatal warnings, e.g. `empty_result` on a valid-but-empty query. */
  warnings?: string[];
}

/** Options accepted by every list/search endpoint. */
export interface ListParams {
  /** Page size, 1–100 (default 25). */
  limit?: number;
  /** Pagination cursor from a prior page's `page.next_cursor`. */
  cursor?: string;
  /**
   * Token-efficient projection: comma-separated dotted field paths to return,
   * e.g. `"accession,form_type,filed_at"`. Accepts a string or string[].
   */
  fields?: string | string[];
  /**
   * Server-side reshaping via a JSON-Schema-like object. Serialized as JSON
   * into the `output_schema` query param.
   */
  output_schema?: Record<string, unknown>;
}

/** Materiality / importance level used by events and monitors. */
export type Importance = "high" | "medium" | "low";

/** A request-scoped object accepted by every method to override defaults. */
export interface RequestOptions {
  /** Per-request timeout in milliseconds (overrides the client default). */
  timeoutMs?: number;
  /** Max retry attempts on 429/5xx for this request (overrides client default). */
  maxRetries?: number;
  /** An AbortSignal to cancel the request. */
  signal?: AbortSignal;
  /** Extra headers merged onto the request. */
  headers?: Record<string, string>;
}

// ───────────────────────────────────────────────────────── Filings & search

export interface FilingSearchParams extends ListParams {
  /** Company CIK (zero-padded 10-digit). */
  cik?: string;
  /** Form type, e.g. "10-K", "8-K", "4". */
  form_type?: string;
  /** Keyword match on company name. */
  q?: string;
  /** Earliest filed date, YYYY-MM-DD. */
  filed_from?: string;
  /** Latest filed date, YYYY-MM-DD. */
  filed_to?: string;
  /** SIC industry code. */
  sic?: string;
  /** State of incorporation. */
  state_of_incorp?: string;
  /** Restrict to XBRL filings. */
  is_xbrl?: boolean;
}

export interface FullTextSearchParams extends ListParams {
  /** Keyword or "exact phrase" to search filing text. Required. */
  q: string;
  /** Comma-separated form types, e.g. "8-K,10-K". */
  forms?: string;
  date_from?: string;
  date_to?: string;
  /** Comma-separated CIKs. */
  ciks?: string;
}

export interface EntitySearchParams extends ListParams {
  cik?: string;
  ticker?: string;
  q?: string;
  /** SIC industry code. */
  sic?: string;
  entity_type?: string;
  state_of_incorp?: string;
}

export interface FinancialsConceptParams {
  /** Exact XBRL concept, e.g. "us-gaap:Revenues". */
  concept?: string;
}

export interface FinancialsSearchParams extends ListParams {
  cik?: string;
  ticker?: string;
  /** Exact XBRL concept, e.g. "Revenues". */
  concept?: string;
  /** Substring over concept name. */
  concept_q?: string;
  /** Substring over entity name. */
  q?: string;
  form?: string;
  fiscal_year?: number;
  unit?: string;
  filed_from?: string;
  filed_to?: string;
  period_end_from?: string;
  period_end_to?: string;
}

export interface FinancialStatementsParams extends ListParams {
  /** Company CIK (numeric). */
  cik?: number;
  /** XBRL tag, e.g. "Assets". */
  tag?: string;
  /** Accession (dashed). */
  adsh?: string;
  /** e.g. "FY", "Q1". */
  fiscal_period?: string;
  sic?: string;
  /** Unit of measure. */
  uom?: string;
  /** Earliest period end, YYYY-MM-DD. */
  ddate_from?: string;
  /** Latest period end, YYYY-MM-DD. */
  ddate_to?: string;
  min_value?: number;
  max_value?: number;
}

// ───────────────────────────────────────────────────── Ownership & insiders

export interface InsiderSearchParams extends ListParams {
  ticker?: string;
  issuer?: string;
  owner?: string;
  issuer_cik?: string;
  owner_cik?: string;
  /** SEC code, e.g. P, S, A, M, F. */
  trans_code?: string;
  /** "A" (acquired) or "D" (disposed). */
  acquired_disposed?: string;
  /** Restrict to derivative (true) or non-derivative (false) trades. */
  derivative?: boolean;
  date_from?: string;
  date_to?: string;
  min_value_usd?: number;
}

export interface Form144SearchParams extends ListParams {
  issuer_cik?: string;
  broker_normalized_name?: string;
  class_of_securities?: string;
  sale_date_from?: string;
  sale_date_to?: string;
  min_market_value_usd?: number;
  min_shares?: number;
}

export interface OwnershipSearchParams extends ListParams {
  issuer?: string;
  person?: string;
  cik_filer?: string;
  cik_subject?: string;
  role?: string;
  form_type?: string;
  /** Substring on form type, e.g. "13D" or "13G". */
  form_class?: string;
  filed_from?: string;
  filed_to?: string;
}

// ───────────────────────────────────────────── Holdings / managers / advisers

export interface HoldingsSearchParams extends ListParams {
  manager?: string;
  issuer?: string;
  cusip?: string;
  min_value?: number;
}

export interface ManagerSearchParams extends ListParams {
  /** Substring over manager name. */
  q?: string;
  /** Minimum reported portfolio value (USD). */
  aum_min?: number;
}

export interface AdviserSearchParams extends ListParams {
  /** Substring match over legal / business name. */
  q?: string;
  state?: string;
  /** Minimum total regulatory AUM in USD. */
  aum_min?: number;
  /** Maximum total regulatory AUM in USD. */
  aum_max?: number;
  /** Only advisers that report private funds. */
  has_private_funds?: boolean;
  /** Filter on Item 11 disciplinary history. */
  disciplinary?: boolean;
}

// ──────────────────────────────────────────────────────────────── Funds

export interface FundHoldingsSearchParams extends ListParams {
  registrant_cik?: string;
  series_id?: string;
  accession_number?: string;
  cusip?: string;
  isin?: string;
  /** Substring over security name. */
  security?: string;
  /** Substring over fund name. */
  fund_name?: string;
  asset_category?: string;
  inv_country?: string;
  report_date?: string;
  report_date_from?: string;
  report_date_to?: string;
  filed_date_from?: string;
  filed_date_to?: string;
  min_value_usd?: number;
  /** Restrict to restricted securities. */
  restricted_only?: boolean;
}

export interface FundProvidersSearchParams extends ListParams {
  filer_cik?: string;
  /** Service-provider role. */
  role?: string;
  provider_cik?: string;
  /** Substring over provider name. */
  provider?: string;
  is_affiliated?: boolean;
  accession_number?: string;
}

export interface PrivateFundSearchParams extends ListParams {
  crd?: string;
  sec_number?: string;
  /** ILIKE pattern over firm name. */
  firm_name?: string;
  /** ILIKE pattern over owner/full name. */
  full_name?: string;
  control_person?: boolean;
}

export interface PrivateFundStatsParams extends ListParams {
  quarter_end_date?: string;
  tab_name?: string;
  row_key?: string;
  metric_key?: string;
  min_value?: number;
  max_value?: number;
}

// ─────────────────────────────────────────────────── Capital & governance

export interface RaiseSearchParams extends ListParams {
  state?: string;
  industry?: string;
  min_amount?: number;
  q?: string;
}

export interface ProxyOfficerSearchParams extends ListParams {
  cik?: string;
  accession_number?: string;
  /** Substring over issuer name. */
  issuer?: string;
  /** Substring over person full name. */
  name?: string;
  /** Substring over title. */
  title?: string;
  is_independent?: boolean;
  min_age?: number;
}

export interface BoardSearchParams extends ListParams {
  source_type?: string;
  sec_cik?: string;
  ein?: string;
  /** ILIKE pattern over organization name. */
  organization_name?: string;
  /** ILIKE pattern over person name. */
  person_name?: string;
  /** ILIKE pattern over role. */
  role?: string;
  min_confidence?: number;
}

export interface CompensationSearchParams extends ListParams {
  /** ILIKE pattern over issuer name. */
  issuer_name?: string;
  filer_cik?: string;
  /** ILIKE pattern over executive name. */
  executive_name?: string;
  fiscal_year?: number;
  min_fiscal_year?: number;
  max_fiscal_year?: number;
  min_total_usd?: number;
  accession_number?: string;
}

// ────────────────────────────────────── Advisers / broker-dealers / people

export interface BrokerDealerSearchParams extends ListParams {
  bd_crd?: string;
  sec_number?: string;
  status?: string;
  /** Substring over broker-dealer name. */
  name?: string;
  main_office_state?: string;
  main_office_country?: string;
  main_office_city?: string;
}

export interface FormCrsSearchParams extends ListParams {
  firm_crd?: string;
  filer_cik?: string;
  /** ILIKE pattern over filer name. */
  filer_name?: string;
  form_sub_type?: string;
  /** 1 = has disciplinary history. */
  disciplinary_history_flag?: number;
  filed_after?: string;
  filed_before?: string;
  min_professionals?: number;
}

export interface IapdIndividualSearchParams extends ListParams {
  /** ILIKE pattern over full name. */
  name?: string;
  last_name?: string;
  first_name?: string;
  ind_source_id?: string;
  ia_scope?: string;
  bc_scope?: string;
  /** 1 = has a disclosure event. */
  has_disclosure?: number;
  firm_count_min?: number;
  firm_count_max?: number;
  cal_date_from?: string;
  cal_date_to?: string;
}

// ─────────────────────────────────── Enforcement / litigation / status

export interface EnforcementSearchParams extends ListParams {
  agency?: string;
  /** ILIKE pattern over respondent name. */
  respondent?: string;
  action_kind?: string;
  /** ILIKE pattern over case number. */
  case_number?: string;
  date_from?: string;
  date_to?: string;
  penalty_min?: number;
}

export interface LitigationSearchParams extends ListParams {
  /** ILIKE pattern over defendants. */
  defendant?: string;
  /** ILIKE pattern over title. */
  title?: string;
  action_type?: string;
  release_number?: string;
  date_from?: string;
  date_to?: string;
}

export interface NtLateSearchParams extends ListParams {
  filer_cik?: string;
  /** ILIKE pattern over filer name. */
  filer_name?: string;
  /** Form the filing is late for, e.g. "10-K". */
  late_for_form?: string;
  form_type?: string;
  filing_date_from?: string;
  filing_date_to?: string;
}

export interface TradingSuspensionSearchParams extends ListParams {
  /** ILIKE pattern over company name. */
  company?: string;
  release_number?: string;
  date_from?: string;
  date_to?: string;
}

export interface WhistleblowerSearchParams extends ListParams {
  fiscal_year?: number;
  min_award_amount_usd?: number;
  max_award_amount_usd?: number;
  /** ILIKE pattern over award order number. */
  award_order_no?: string;
  /** ILIKE pattern over public summary. */
  public_summary?: string;
}

export interface CyberIncidentSearchParams extends ListParams {
  date_from?: string;
  date_to?: string;
  /** Comma-separated CIKs. */
  ciks?: string;
}

export interface PatentGrantSearchParams extends ListParams {
  patent_number?: string;
  /** ILIKE pattern over patent title. */
  title?: string;
  /** ILIKE pattern over assignee name. */
  assignee?: string;
  assignee_state?: string;
  assignee_country?: string;
  kind_code?: string;
  application_number?: string;
  grant_year?: number;
  grant_date_from?: string;
  grant_date_to?: string;
  claims_count_min?: number;
}

// ───────────────────────────────────────────────────── Filing sub-resources

export interface ExtractParams {
  /** e.g. "1A" (Risk Factors), "7" (MD&A), "5.02". */
  item: string;
}

export interface ProxyVotesParams extends ListParams {}

// ─────────────────────────────────────────────────────── Events & monitors

export interface EventSearchParams extends ListParams {
  /** Exact event type, e.g. "sec.8k.executive_change". */
  event_type?: string;
  /** Issuer CIK (zero-padded 10-digit). */
  cik?: string;
  /** Issuer ticker. */
  ticker?: string;
  importance?: Importance;
  /** Minimum rule-based materiality score (1–3). */
  min_materiality?: number;
  /** bullish | bearish | neutral | ambiguous. */
  direction?: string;
  /** Earliest detected date, YYYY-MM-DD. */
  date_from?: string;
}

export type MonitorTargetType =
  | "ticker"
  | "cik"
  | "company"
  | "form"
  | "event_type"
  | "watchlist";

export type MonitorCadence = "1h" | "6h" | "1d" | "7d";

export interface CreateMonitorParams {
  /** Human label for the monitor. */
  name: string;
  /** What to watch. */
  target_type: MonitorTargetType;
  /** The value, e.g. "NVDA", "0001045810", or "8-K". */
  target_value: string;
  /** Event types to match; empty/omitted = every event for the target. */
  signals?: string[];
  /** Minimum importance to fire on (default "low"). */
  materiality?: Importance;
  /** Minimum rule-based materiality score (1–3). */
  min_materiality?: number;
  /** Advisory check cadence: 1h | 6h | 1d | 7d. */
  cadence?: MonitorCadence;
  /** Arbitrary key/values echoed into the webhook payload (e.g. routing). */
  metadata?: Record<string, unknown>;
  /** JSON Schema to reshape the matched event in the webhook payload. */
  output_schema?: Record<string, unknown>;
  /** Evaluate against recent events immediately on creation. */
  trigger_on_create?: boolean;
  /** Endpoint to deliver matches to (from webhooks.endpoints.list()). */
  webhook_endpoint_id?: string;
}

export interface UpdateMonitorParams {
  name?: string;
  status?: "active" | "paused";
  signals?: string[];
  materiality?: Importance;
  min_materiality?: number;
  cadence?: MonitorCadence;
  metadata?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  webhook_endpoint_id?: string;
}

// ───────────────────────────────────────────────────────────── Webhooks

export interface CreateWebhookEndpointParams {
  /** Endpoint URL (must be https://). */
  url: string;
  description?: string;
}

export interface WebhookDeliveriesParams {
  /** Restrict to one endpoint id. */
  endpoint_id?: string;
  /** Page size, 1–200 (default 50). */
  limit?: number;
}

// ─────────────────────────────────────────────────────────────────── AI

export interface AnswerParams {
  /** The question to answer. Required. */
  q: string;
  /** Scope to one entity by CIK. */
  cik?: string;
  /** Scope to one entity by ticker. */
  ticker?: string;
  /** Scope to a single filing by accession. */
  accession?: string;
  /** Comma-separated form types to restrict grounding to. */
  forms?: string;
  /** Number of source filings to ground on, 1–8 (default 4). */
  max_sources?: number;
  /** JSON Schema for a structured answer. */
  output_schema?: Record<string, unknown>;
}

/** A single OpenAI-style chat message. */
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface ChatCompletionParams {
  /** Use "clous". */
  model?: string;
  /** The conversation; the last user message is answered. */
  messages: ChatMessage[];
  [key: string]: unknown;
}
