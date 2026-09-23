import type { MongoSearchStage } from "src/types/MongoSearchStage";

/**
 * The `$search` options a search may pass through `.provider()`. Scout writes
 * the rest from the search itself, and pages with `$skip`, so `searchAfter`
 * and `searchBefore` are left out.
 *
 * @example
 * ```ts
 * products.search("shoe").provider({ concurrent: true });
 * ```
 * @see [mongodb adapter](https://priemskiyyy.github.io/scout/adapters.html#mongodb-search)
 */
export type MongoSearchOptions = Omit<
  MongoSearchStage,
  "index" | "compound" | "facet" | "count" | "highlight" | "sort"
>;
