/**
 * The search parameters Scout writes from the search itself, the aliases
 * that would overwrite them, and, on the Elasticsearch client, `index` and
 * the whole `body`.
 */
export const RESERVED_OPTIONS: readonly string[] = [
  "index",
  "body",
  "query",
  "from",
  "size",
  "sort",
  "aggs",
  "aggregations",
  "highlight",
  "track_total_hits",
];
