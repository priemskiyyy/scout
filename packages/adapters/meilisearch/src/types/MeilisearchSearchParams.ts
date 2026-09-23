/**
 * The Meilisearch search parameters this adapter reads and writes, a
 * structural subset of the SDK's `SearchParams`, which
 * `src/meilisearch.contracts.ts` pins. The query travels in the first
 * argument of `search`, so it is not one of them.
 *
 * @example
 * ```ts
 * const params: MeilisearchSearchParams = { page: 1, hitsPerPage: 20, facets: ["brand"] };
 * ```
 * @see [meilisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#meilisearch)
 */
export type MeilisearchSearchParams = {
  attributesToSearchOn?: string[] | null;
  filter?: string;
  sort?: string[];
  facets?: string[];
  attributesToHighlight?: string[];
  highlightPreTag?: string;
  highlightPostTag?: string;
  page?: number;
  hitsPerPage?: number;
  offset?: number;
  limit?: number;
  attributesToRetrieve?: string[];
  attributesToCrop?: string[];
  cropLength?: number;
  cropMarker?: string;
  matchingStrategy?: "all" | "last" | "frequency";
  rankingScoreThreshold?: number;
  showRankingScore?: boolean;
  distinct?: string;
  locales?: string[];
};
