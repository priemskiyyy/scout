import type { MeilisearchSearchHit } from "src/types/MeilisearchSearchHit";

/**
 * One Meilisearch search response. Both pagination shapes are optional here
 * because the adapter reads whichever one the mode it asked for produced, and
 * refuses to invent a total when neither arrived.
 *
 * @example
 * ```ts
 * const response: MeilisearchSearchResponse = { hits: [], totalHits: 0, totalPages: 0, page: 1 };
 * ```
 * @see [meilisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#meilisearch)
 */
export type MeilisearchSearchResponse = {
  hits: MeilisearchSearchHit[];
  processingTimeMs?: number;
  query?: string;
  facetDistribution?: Record<string, Record<string, number>>;
  facetStats?: Record<string, { min: number; max: number }>;
  totalHits?: number;
  totalPages?: number;
  page?: number;
  hitsPerPage?: number;
  offset?: number;
  limit?: number;
  estimatedTotalHits?: number;
};
