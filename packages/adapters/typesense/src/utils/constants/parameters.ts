/** The search parameters Scout writes from the search itself. */
export const RESERVED_OPTIONS: readonly string[] = [
  "q",
  "query_by",
  "prefix",
  "filter_by",
  "sort_by",
  "facet_by",
  "page",
  "per_page",
  "highlight_fields",
  "highlight_start_tag",
  "highlight_end_tag",
];
