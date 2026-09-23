import type { SearchAdapter } from "@priemskiyyy/scout";

import type { AlgoliaHit } from "src/types/AlgoliaHit";
import type { AlgoliaSearchClient } from "src/types/AlgoliaSearchClient";
import type { AlgoliaSearchOptions } from "src/types/AlgoliaSearchOptions";
import type { AlgoliaSearchResponse } from "src/types/AlgoliaSearchResponse";

/**
 * The adapter this package builds. `sorts` is its replicas, keyed by the
 * index's sort names, so a sort without one is a compile error where the
 * Scout is built.
 *
 * @example
 * ```ts
 * const adapter: AlgoliaSearchAdapter<"priceAsc"> = algolia({
 *   client, indexName: "products", replicas: { priceAsc: "products_price_asc" },
 * });
 * ```
 * @see [algolia adapter](https://priemskiyyy.github.io/scout/adapters.html#algolia)
 */
export type AlgoliaSearchAdapter<TSortName extends string = never> =
  SearchAdapter<
    AlgoliaSearchClient,
    AlgoliaSearchOptions,
    AlgoliaHit,
    AlgoliaSearchResponse
  > & {
    readonly sorts: Readonly<Record<TSortName, string>>;
  };
