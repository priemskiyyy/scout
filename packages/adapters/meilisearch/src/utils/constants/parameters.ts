/**
 * The search parameters Scout writes from the search itself. `q` is among
 * them because the SDK spreads the options over the query it was given.
 */
export const RESERVED_OPTIONS: readonly string[] = [
  "q",
  "attributesToSearchOn",
  "filter",
  "sort",
  "facets",
  "page",
  "hitsPerPage",
  "offset",
  "limit",
  "attributesToHighlight",
  "highlightPreTag",
  "highlightPostTag",
];

/** The keys Meilisearch adds to a hit, which are not part of the document. */
export const HIT_METADATA_KEYS: readonly string[] = [
  "_formatted",
  "_matchesPosition",
  "_rankingScore",
  "_rankingScoreDetails",
  "_federation",
  "_vectors",
];
