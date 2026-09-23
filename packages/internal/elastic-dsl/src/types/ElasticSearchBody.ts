import type { ElasticHighlight } from "src/types/ElasticHighlight";
import type { ElasticQuery } from "src/types/ElasticQuery";
import type { ElasticSortClause } from "src/types/ElasticSortClause";

/**
 * The search body this module writes, and the settings a search may add.
 *
 * It is a structural subset of both engines' search body, so neither adapter
 * imports an SDK at runtime, and each adapter's contracts file pins it to its
 * engine's real request type.
 *
 * @example
 * ```ts
 * const body: ElasticSearchBody = { query: { match_all: {} }, from: 0, size: 20 };
 * ```
 */
export type ElasticSearchBody = {
  query: ElasticQuery;
  from: number;
  size: number;
  sort?: ElasticSortClause[];
  aggs?: Record<string, { terms: { field: string } }>;
  highlight?: ElasticHighlight;
  track_total_hits?: true;
  min_score?: number;
  timeout?: string;
  track_scores?: boolean;
  explain?: boolean;
};
