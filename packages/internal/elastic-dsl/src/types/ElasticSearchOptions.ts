import type { ElasticSearchBody } from "src/types/ElasticSearchBody";

/**
 * The search body settings a search may pass through `.provider()`. Scout
 * writes the query, the page, the sort, the aggregations, the highlights and
 * the total tracking from the search itself.
 *
 * @example
 * ```ts
 * products.search("shoe").provider({ min_score: 1.5, timeout: "2s" });
 * ```
 */
export type ElasticSearchOptions = Omit<
  ElasticSearchBody,
  "query" | "from" | "size" | "sort" | "aggs" | "highlight" | "track_total_hits"
>;
