/**
 * Known queries and fields used to test an adapter against its configured corpus.
 *
 * @example
 * ```ts
 * const fixtures: SearchAdapterConformanceFixtures = {
 *   index: "products", query: "shoe", sort: "relevance", profile: "default",
 *   equality: { field: "brand", value: "Acme" }, evaluatesFilters: true,
 * };
 * ```
 *
 * @see [Adapter testing](https://priemskiyyy.github.io/scout/writing-an-adapter.html)
 */
export type SearchAdapterConformanceFixtures = {
  /** The index or collection the adapter was configured against. */
  index: string;
  /** Text that matches at least two documents. */
  query: string;
  /** A sort name the adapter declares. */
  sort: string;
  /** A profile name the adapter declares. */
  profile: string;
  /** A filterable field and a value at least one document holds. */
  equality: { field: string; value: unknown };
  /** A numeric field and a range at least one document falls inside. */
  range?: { field: string; min: number; max: number };
  /**
   * Whether the thing behind this adapter really evaluates filters.
   *
   * A local engine does, and so does a fake that implements the engine's filter
   * grammar. A fake that only records the request does not, and against one of
   * those an assertion about which documents came back proves nothing, so those
   * blocks are skipped rather than passed vacuously. An adapter in that
   * position asserts the request it emitted in its own tests instead, which
   * `docs/verification.md` records.
   */
  evaluatesFilters?: boolean;
  /** A facetable field, when the adapter declares result scoped facets. */
  facet?: string;
  /** A highlightable field, when the adapter declares highlight parts. */
  highlight?: string;
};
