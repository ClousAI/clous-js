import type { HttpClient } from "../client.js";
import { normalizeListParams } from "../client.js";
import type {
  Envelope,
  ExtractParams,
  FilingSearchParams,
  FullTextSearchParams,
  ProxyVotesParams,
  RequestOptions,
} from "../types.js";

const enc = encodeURIComponent;

/**
 * EDGAR filing index plus on-demand, per-filing extractions (documents,
 * sections, 8-K events, insiders, subsidiaries, crowdfunding, proxy votes,
 * and an AI briefing).
 */
export class FilingsResource {
  constructor(private readonly http: HttpClient) {}

  /** Search the EDGAR filing index across all form types. `GET /v1/filings`. */
  search<T = Record<string, unknown>>(
    params: FilingSearchParams = {},
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>("/v1/filings", normalizeListParams(params), options);
  }

  /** Auto-paginating iterator over `GET /v1/filings`. */
  iterate<T = Record<string, unknown>>(
    params: FilingSearchParams = {},
    options?: RequestOptions,
  ): AsyncGenerator<T, void, unknown> {
    return this.http.paginate<T>("/v1/filings", params, options);
  }

  /** Full-text search across filing bodies (2001+). `GET /v1/full-text`. */
  fullText<T = Record<string, unknown>>(
    params: FullTextSearchParams,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>("/v1/full-text", normalizeListParams(params), options);
  }

  /** Auto-paginating iterator over full-text search. */
  iterateFullText<T = Record<string, unknown>>(
    params: FullTextSearchParams,
    options?: RequestOptions,
  ): AsyncGenerator<T, void, unknown> {
    return this.http.paginate<T>("/v1/full-text", params, options);
  }

  /** Document manifest for a filing. `GET /v1/filings/{accession}/documents`. */
  documents<T = Record<string, unknown>>(
    accession: string,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>(`/v1/filings/${enc(accession)}/documents`, undefined, options);
  }

  /** Extract a named section (Risk Factors, MD&A, …). `GET /v1/filings/{accession}/extract`. */
  extract<T = Record<string, unknown>>(
    accession: string,
    params: ExtractParams,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>(`/v1/filings/${enc(accession)}/extract`, { ...params }, options);
  }

  /** Classified 8-K reported items. `GET /v1/filings/{accession}/events`. */
  events<T = Record<string, unknown>>(
    accession: string,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>(`/v1/filings/${enc(accession)}/events`, undefined, options);
  }

  /** Structured Form 3/4/5 ownership detail for a filing. `GET /v1/filings/{accession}/insiders`. */
  insiders<T = Record<string, unknown>>(
    accession: string,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>(`/v1/filings/${enc(accession)}/insiders`, undefined, options);
  }

  /** Exhibit 21 subsidiaries from a 10-K. `GET /v1/filings/{accession}/subsidiaries`. */
  subsidiaries<T = Record<string, unknown>>(
    accession: string,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>(`/v1/filings/${enc(accession)}/subsidiaries`, undefined, options);
  }

  /** Structured Reg CF Form C offering. `GET /v1/filings/{accession}/crowdfunding`. */
  crowdfunding<T = Record<string, unknown>>(
    accession: string,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>(`/v1/filings/${enc(accession)}/crowdfunding`, undefined, options);
  }

  /** Structured N-PX proxy-voting records. `GET /v1/filings/{accession}/proxy-votes`. */
  proxyVotes<T = Record<string, unknown>>(
    accession: string,
    params: ProxyVotesParams = {},
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>(
      `/v1/filings/${enc(accession)}/proxy-votes`,
      normalizeListParams(params),
      options,
    );
  }

  /** AI briefing — materiality, direction, plain-English read. `GET /v1/filings/{accession}/briefing`. */
  briefing<T = Record<string, unknown>>(
    accession: string,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>(`/v1/filings/${enc(accession)}/briefing`, undefined, options);
  }
}
