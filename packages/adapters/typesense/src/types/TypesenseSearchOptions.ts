import type { TypesenseSearchParameters } from "src/types/TypesenseSearchParameters";

/**
 * The Typesense parameters a search may pass through `.provider()`. Scout
 * writes the rest from the search itself, and `group_by` would answer with a
 * result shape Scout does not map.
 *
 * @example
 * ```ts
 * products.search("shoe").provider({ num_typos: 1, exhaustive_search: true });
 * ```
 * @see [typesense adapter](https://priemskiyyy.github.io/scout/adapters.html#typesense)
 */
export type TypesenseSearchOptions = Omit<
  TypesenseSearchParameters,
  | "q"
  | "query_by"
  | "prefix"
  | "filter_by"
  | "sort_by"
  | "facet_by"
  | "page"
  | "per_page"
  | "highlight_fields"
  | "highlight_start_tag"
  | "highlight_end_tag"
  | "group_by"
>;
