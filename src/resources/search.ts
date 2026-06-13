import type { HttpClient } from "../client.js";
import { normalizeListParams } from "../client.js";
import type { Envelope, ListParams, RequestOptions } from "../types.js";

/**
 * A reusable resource for the many "search a dataset" endpoints that all share
 * the same shape: `GET <path>` returning the standard envelope, plus an
 * auto-paginating `iterate()`. The parameter type `P` is supplied per-endpoint
 * so callers still get full typing.
 */
export class SearchResource<P extends ListParams = ListParams> {
  constructor(
    protected readonly http: HttpClient,
    protected readonly path: string,
  ) {}

  /** Run the search, returning one page of the envelope. */
  search<T = Record<string, unknown>>(
    params: P = {} as P,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>(this.path, normalizeListParams(params), options);
  }

  /** Alias for {@link search}. */
  list<T = Record<string, unknown>>(
    params: P = {} as P,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.search<T>(params, options);
  }

  /** Auto-paginating iterator that follows `page.next_cursor` to the end. */
  iterate<T = Record<string, unknown>>(
    params: P = {} as P,
    options?: RequestOptions,
  ): AsyncGenerator<T, void, unknown> {
    return this.http.paginate<T>(this.path, params, options);
  }
}
