/**
 * What an adapter has to be told about one index, because a search never
 * reports its mapping or its limits.
 *
 * @example
 * ```ts
 * const settings: ElasticSearchSettings = { keywords: { brand: "brand.keyword" } };
 * ```
 */
export type ElasticSearchSettings = {
  /**
   * The field holding a field's exact value, keyed by the field, such as
   * `brand.keyword` for a `brand` mapped as `text`. Filters, facets and sorts
   * read it, because a `term` on a `text` field compares analysed tokens and
   * the engine refuses to aggregate or sort one. A field not named here is
   * used as it is named, and has to be mapped as `keyword`, a number or a
   * boolean.
   */
  keywords?: Readonly<Record<string, string>>;
  /** Counts every match, rather than stopping at 10,000, at a cost in speed. */
  trackTotalHits?: boolean;
  /** The index's `max_result_window`, 10,000 unless it was changed. */
  maxResultWindow?: number;
};
