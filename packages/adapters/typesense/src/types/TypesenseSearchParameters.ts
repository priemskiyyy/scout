/**
 * The Typesense search parameters this adapter reads and writes.
 *
 * It is a structural subset of the SDK's `SearchParams`, so the package imports
 * no SDK at runtime. `src/typesense.contracts.ts` pins it to the real type, and
 * a parameter that is not listed here is one the adapter cannot carry.
 *
 * @example
 * ```ts
 * const params: TypesenseSearchParameters = { q: "shoe", query_by: "name", page: 1, per_page: 20 };
 * ```
 * @see [typesense adapter](https://priemskiyyy.github.io/scout/adapters.html#typesense)
 */
export type TypesenseSearchParameters = {
  q?: string;
  query_by?: string;
  query_by_weights?: string;
  prefix?: boolean;
  filter_by?: string;
  sort_by?: string;
  facet_by?: string;
  max_facet_values?: number;
  facet_query?: string;
  facet_strategy?: "exhaustive" | "top_values" | "automatic";
  group_by?: string;
  page?: number;
  per_page?: number;
  include_fields?: string;
  exclude_fields?: string;
  highlight_fields?: string;
  highlight_full_fields?: string;
  highlight_affix_num_tokens?: number;
  highlight_start_tag?: string;
  highlight_end_tag?: string;
  snippet_threshold?: number;
  num_typos?: string | number;
  drop_tokens_threshold?: number;
  typo_tokens_threshold?: number;
  prioritize_exact_match?: boolean;
  exhaustive_search?: boolean;
  search_cutoff_ms?: number;
  use_cache?: boolean;
  pinned_hits?: string;
  hidden_hits?: string;
  limit_hits?: number;
  preset?: string;
};
