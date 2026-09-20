import type { AlgoliaSearchProps } from "src/types/AlgoliaSearchProps";
import type { AlgoliaRequestOptions } from "src/types/AlgoliaRequestOptions";
import type { AlgoliaSearchResponse } from "src/types/AlgoliaSearchResponse";

/**
 * The shape of the injected Algolia client. It is typed structurally so this
 * package imports no SDK at runtime, and `src/algolia.contracts.ts` pins it to
 * the real `algoliasearch` types.
 *
 * `searchSingleIndexWithHTTPInfo` is here because it is the only search call
 * that bypasses the client's own request and response caches.
 *
 * @example
 * ```ts
 * const client: AlgoliaSearchClient = algoliasearch(appId, searchOnlyKey);
 * ```
 * @see [algolia adapter](https://priemskiyyy.github.io/scout/adapters.html#algolia)
 */
export type AlgoliaSearchClient = {
  searchSingleIndex(
    props: AlgoliaSearchProps,
    requestOptions?: AlgoliaRequestOptions,
  ): Promise<AlgoliaSearchResponse>;
  searchSingleIndexWithHTTPInfo(
    props: AlgoliaSearchProps,
    requestOptions?: AlgoliaRequestOptions,
  ): Promise<{ data: AlgoliaSearchResponse }>;
};
