/**
 * The two methods a search endpoint sensibly takes. A `GET` carries the
 * request in the query string, a `POST` in a JSON body.
 *
 * @example
 * ```ts
 * const method: HttpMethod = "POST";
 * ```
 * @see [http adapter](https://priemskiyyy.github.io/scout/adapters.html#http-your-own-endpoint)
 */
export type HttpMethod = "POST" | "GET";
