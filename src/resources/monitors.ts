import type { HttpClient } from "../client.js";
import type {
  CreateMonitorParams,
  Envelope,
  RequestOptions,
  UpdateMonitorParams,
} from "../types.js";

const enc = encodeURIComponent;

/** Monitors — standing watches that fire (and optionally webhook) on matching events. */
export class MonitorsResource {
  constructor(private readonly http: HttpClient) {}

  /** List the monitors on your account. `GET /v1/monitors`. */
  list<T = Record<string, unknown>>(
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>("/v1/monitors", undefined, options);
  }

  /** Create a monitor. `POST /v1/monitors`. */
  create<T = Record<string, unknown>>(
    params: CreateMonitorParams,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.post<T>("/v1/monitors", params, options);
  }

  /** Get a single monitor by id. `GET /v1/monitors/{id}`. */
  get<T = Record<string, unknown>>(
    id: string,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>(`/v1/monitors/${enc(id)}`, undefined, options);
  }

  /** Update a monitor (pause/resume, rename, retarget). `PATCH /v1/monitors/{id}`. */
  update<T = Record<string, unknown>>(
    id: string,
    params: UpdateMonitorParams,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.patch<T>(`/v1/monitors/${enc(id)}`, params, options);
  }

  /** Pause a monitor without deleting it. */
  pause<T = Record<string, unknown>>(
    id: string,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.update<T>(id, { status: "paused" }, options);
  }

  /** Resume a paused monitor. */
  resume<T = Record<string, unknown>>(
    id: string,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.update<T>(id, { status: "active" }, options);
  }

  /** Delete a monitor by id. `DELETE /v1/monitors/{id}`. */
  delete<T = Record<string, unknown>>(
    id: string,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.delete<T>(`/v1/monitors/${enc(id)}`, options);
  }
}
