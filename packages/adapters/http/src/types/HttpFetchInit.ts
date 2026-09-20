import type { HttpHeaders } from "src/types/HttpHeaders";

/**
 * Exactly what this adapter passes to fetch, and nothing more.
 *
 * @example
 * ```ts
 * const init: HttpFetchInit = { method: "GET", headers: {}, signal: controller.signal };
 * ```
 * @see [http adapter](https://priemskiyyy.github.io/scout/adapters.html#http-your-own-endpoint)
 */
export type HttpFetchInit = {
  method: string;
  headers: HttpHeaders;
  body?: string;
  signal: AbortSignal;
};
