import type { AlgoliaSearchClient } from "src/types/AlgoliaSearchClient";
import type { AlgoliaSearchOptions } from "src/types/AlgoliaSearchOptions";

/**
 * The index to search on an Algolia client the application owns, and the
 * replica that serves each of the index's sorts.
 *
 * @example
 * ```ts
 * const options: AlgoliaAdapterOptions<"priceAsc"> = {
 *   client, indexName: "products", replicas: { priceAsc: "products_price_asc" },
 * };
 * ```
 * @see [algolia adapter](https://priemskiyyy.github.io/scout/adapters.html#algolia)
 */
export type AlgoliaAdapterOptions<TSortName extends string = never> = {
  /** A search client the application owns. The adapter never disposes it. */
  client: AlgoliaSearchClient;
  /** The primary index, which serves the relevance order. */
  indexName: string;
  /**
   * The replica index serving each of the index's sorts, keyed by sort name.
   * Algolia has no per search sort, so every sort but relevance needs one.
   */
  replicas?: Readonly<Record<TSortName, string>>;
  /** Parameters each of the index's profiles adds, keyed by profile name. */
  profiles?: Readonly<Record<string, AlgoliaSearchOptions>>;
  /**
   * Whether the client's own `requestsCache` and `responsesCache` may answer
   * a search. Off by default, because TanStack Query already owns caching and
   * a cache inside the client would swallow an invalidation.
   */
  cache?: boolean;
  /**
   * The index's `paginationLimitedTo` setting, 1000 unless it was changed.
   * A total past it counts matches that pagination cannot reach.
   */
  paginationLimitedTo?: number;
};
