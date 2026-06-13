import type { HttpClient } from "../client.js";
import { normalizeListParams } from "../client.js";
import type {
  Envelope,
  EventSearchParams,
  RequestOptions,
} from "../types.js";

const enc = encodeURIComponent;

/** The normalized, evidence-backed SEC business-change event feed. */
export class EventsResource {
  constructor(private readonly http: HttpClient) {}

  /** Query the events feed. `GET /v1/events`. */
  list<T = Record<string, unknown>>(
    params: EventSearchParams = {},
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>("/v1/events", normalizeListParams(params), options);
  }

  /** Auto-paginating iterator over the events feed. */
  iterate<T = Record<string, unknown>>(
    params: EventSearchParams = {},
    options?: RequestOptions,
  ): AsyncGenerator<T, void, unknown> {
    return this.http.paginate<T>("/v1/events", params, options);
  }

  /** A single event with full evidence. `GET /v1/events/{id}`. */
  get<T = Record<string, unknown>>(
    id: string,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>(`/v1/events/${enc(id)}`, undefined, options);
  }
}
