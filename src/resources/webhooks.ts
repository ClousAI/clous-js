import type { HttpClient } from "../client.js";
import type {
  CreateWebhookEndpointParams,
  Envelope,
  RequestOptions,
  WebhookDeliveriesParams,
} from "../types.js";

/** Registered webhook endpoints and their delivery log. */
export class WebhooksResource {
  readonly endpoints: WebhookEndpointsResource;
  constructor(private readonly http: HttpClient) {
    this.endpoints = new WebhookEndpointsResource(http);
  }

  /** Webhook delivery log. `GET /v1/webhooks/deliveries`. */
  deliveries<T = Record<string, unknown>>(
    params: WebhookDeliveriesParams = {},
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>("/v1/webhooks/deliveries", { ...params }, options);
  }
}

/** CRUD for `GET`/`POST /v1/webhooks/endpoints`. */
export class WebhookEndpointsResource {
  constructor(private readonly http: HttpClient) {}

  /** List your registered endpoints. `GET /v1/webhooks/endpoints`. */
  list<T = Record<string, unknown>>(
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.get<T>("/v1/webhooks/endpoints", undefined, options);
  }

  /** Register an https endpoint. `POST /v1/webhooks/endpoints`. */
  create<T = Record<string, unknown>>(
    params: CreateWebhookEndpointParams,
    options?: RequestOptions,
  ): Promise<Envelope<T>> {
    return this.http.post<T>("/v1/webhooks/endpoints", params, options);
  }
}
