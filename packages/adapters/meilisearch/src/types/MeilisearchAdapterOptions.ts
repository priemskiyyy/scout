import type { MeilisearchIndexClient } from "src/types/MeilisearchIndexClient";
import type { MeilisearchSearchOptions } from "src/types/MeilisearchSearchOptions";

/**
 * The index to search on a Meilisearch client the application owns.
 *
 * @example
 * ```ts
 * const options: MeilisearchAdapterOptions = {
 *   index: client.index("products"),
 *   profiles: { names: { matchingStrategy: "all" } },
 * };
 * ```
 * @see [meilisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#meilisearch)
 */
export type MeilisearchAdapterOptions = {
  /** The index client the application built and owns. */
  index: MeilisearchIndexClient;
  /** Tuning for the index's profiles, keyed by profile name. */
  profiles?: Readonly<Record<string, MeilisearchSearchOptions>>;
  /**
   * `"page"` sends `page` and `hitsPerPage` and reports an exhaustive total.
   * `"offset"` sends `offset` and `limit` and reports an estimate. Scout is
   * page based, so `"page"` is the default.
   */
  pagination?: "page" | "offset";
  /**
   * The index's configured `pagination.maxTotalHits`. Page mode counts up to
   * this number and stops, so a total that reaches it is a cap rather than a
   * count. Meilisearch's own default is 1000.
   */
  maxTotalHits?: number;
};
