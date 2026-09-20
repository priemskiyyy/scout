/**
 * Header names and values, as a backend expects to receive them.
 *
 * @example
 * ```ts
 * const headers: HttpHeaders = { Accept: "application/json" };
 * ```
 * @see [http adapter](https://priemskiyyy.github.io/scout/adapters.html#http-your-own-endpoint)
 */
export type HttpHeaders = Readonly<Record<string, string>>;
