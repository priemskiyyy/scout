import type { MeilisearchSearchOptions } from "src/types/MeilisearchSearchOptions";

/**
 * The request body this adapter builds, Scout owned keys included.
 *
 * @example
 * ```ts
 * const params: MeilisearchSearchParams = { page: 1, hitsPerPage: 20, facets: ["brand"] };
 * ```
 * @see [meilisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#meilisearch)
 */
export type MeilisearchSearchParams = MeilisearchSearchOptions & {
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
};
