/**
 * The search parameters Scout writes from the search itself. `offset` and
 * `length` are here because either one silently overrides `page` and
 * `hitsPerPage`, and the filter kinds because they would narrow a search
 * behind the filter Scout sent.
 */
export const RESERVED_OPTIONS: readonly string[] = [
  "query",
  "filters",
  "numericFilters",
  "facetFilters",
  "tagFilters",
  "page",
  "hitsPerPage",
  "offset",
  "length",
  "facets",
  "restrictSearchableAttributes",
  "attributesToHighlight",
  "highlightPreTag",
  "highlightPostTag",
];
