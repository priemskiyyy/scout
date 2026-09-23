import type { MeilisearchSearchParams } from "src/types/MeilisearchSearchParams";

/**
 * The Meilisearch parameters a profile or a `.provider()` call may set. Scout
 * writes the rest from the search itself.
 *
 * @example
 * ```ts
 * products.search("shoe").provider({ matchingStrategy: "all" });
 * ```
 * @see [meilisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#meilisearch)
 */
export type MeilisearchSearchOptions = Omit<
  MeilisearchSearchParams,
  | "attributesToSearchOn"
  | "filter"
  | "sort"
  | "facets"
  | "attributesToHighlight"
  | "highlightPreTag"
  | "highlightPostTag"
  | "page"
  | "hitsPerPage"
  | "offset"
  | "limit"
>;
