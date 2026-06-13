import type { HttpClient, QueryValue } from "../client.js";
import { normalizeListParams } from "../client.js";
import { SearchResource } from "./search.js";
import type {
  AdviserSearchParams,
  Envelope,
  FinancialsConceptParams,
  RequestOptions,
} from "../types.js";

const enc = encodeURIComponent;

/** Form ADV advisers: search + fetch a full profile by CRD. */
export class AdvisersResource extends SearchResource<AdviserSearchParams> {
  constructor(http: HttpClient) {
    super(http, "/v1/advisers");
  }

  /** Full adviser profile by CRD. `GET /v1/advisers/{crd}`. */
  get<T = Record<string, unknown>>(
    crd: string,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>(`/v1/advisers/${enc(crd)}`, undefined, options);
  }
}

/** XBRL financials: cross-company search + all facts for one company by CIK. */
export class FinancialsResource extends SearchResource {
  constructor(http: HttpClient) {
    super(http, "/v1/financials");
  }

  /** Every reported XBRL fact for one company. `GET /v1/financials/{cik}`. */
  get<T = Record<string, unknown>>(
    cik: string,
    params: FinancialsConceptParams = {},
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>(
      `/v1/financials/${enc(cik)}`,
      { ...params } as Record<string, QueryValue>,
      options,
    );
  }
}

/** Dataset catalog & freshness, and the account's plan/credits. */
export class MetaResource {
  constructor(private readonly http: HttpClient) {}

  /** Dataset catalog + freshness. `GET /v1/sources`. */
  sources<T = Record<string, unknown>>(
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>("/v1/sources", undefined, options);
  }

  /** Plan and remaining credits for the configured key. `GET /v1/account`. */
  account<T = Record<string, unknown>>(
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>("/v1/account", undefined, options);
  }
}

/** Insider transactions (Form 3/4/5) plus the Form 144 sub-endpoint. */
export class InsiderResource extends SearchResource {
  constructor(http: HttpClient) {
    super(http, "/v1/insider");
  }

  /** Form 144 proposed-sale notices. `GET /v1/insider/form144`. */
  form144<T = Record<string, unknown>>(
    params: Record<string, QueryValue> = {},
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>(
      "/v1/insider/form144",
      normalizeListParams(params),
      options,
    );
  }

  /** Auto-paginating iterator over Form 144 notices. */
  iterateForm144<T = Record<string, unknown>>(
    params: Record<string, QueryValue> = {},
    options?: RequestOptions,
  ): AsyncGenerator<T, void, unknown> {
    return this.http.paginate<T>("/v1/insider/form144", params, options);
  }
}

/** N-PORT holdings + N-CEN providers, under one `funds` namespace. */
export class FundsResource {
  readonly holdings: SearchResource;
  readonly providers: SearchResource;
  constructor(http: HttpClient) {
    this.holdings = new SearchResource(http, "/v1/funds/holdings");
    this.providers = new SearchResource(http, "/v1/funds/providers");
  }
}
