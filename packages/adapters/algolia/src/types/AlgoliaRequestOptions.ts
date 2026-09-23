/**
 * Per request options Algolia accepts. There is no `signal` here, because
 * `@algolia/client-common` has no `AbortSignal` support at all, so an aborted
 * search stops Scout waiting while Algolia still answers it.
 *
 * @example
 * ```ts
 * const requestOptions: AlgoliaRequestOptions = { headers: { "X-Request-ID": "search-1" } };
 * ```
 * @see [algolia adapter](https://priemskiyyy.github.io/scout/adapters.html#algolia)
 */
export type AlgoliaRequestOptions = {
  headers?: Readonly<Record<string, string>> | undefined;
  queryParameters?: Readonly<Record<string, unknown>> | undefined;
};
