/**
 * The JSON object `toRequest` builds. On a `POST` it is the body verbatim. On
 * a `GET` each entry becomes one query parameter: a string travels as itself
 * and anything else as JSON, which is the only encoding that round-trips an
 * array or a nested object. An `undefined` value is left out.
 *
 * @example
 * ```ts
 * const body: HttpRequestBody = { query: "shoe", page: 1, tags: ["sale"] };
 * ```
 * @see [http adapter](https://priemskiyyy.github.io/scout/adapters.html#http-your-own-endpoint)
 */
export type HttpRequestBody = Readonly<Record<string, unknown>>;
