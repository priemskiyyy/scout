/**
 * The Algolia search parameters a search may pass through `.provider()`, and
 * a profile adds to every search that names it. Scout writes the rest from
 * the search itself.
 *
 * @example
 * ```ts
 * products.search("shoe").provider({ distinct: true, typoTolerance: "min" });
 * ```
 * @see [algolia adapter](https://priemskiyyy.github.io/scout/adapters.html#algolia)
 */
export type AlgoliaSearchOptions = Readonly<Record<string, unknown>> & {
  readonly query?: never;
  readonly filters?: never;
  readonly numericFilters?: never;
  readonly facetFilters?: never;
  readonly tagFilters?: never;
  readonly page?: never;
  readonly hitsPerPage?: never;
  readonly offset?: never;
  readonly length?: never;
  readonly facets?: never;
  readonly restrictSearchableAttributes?: never;
  readonly attributesToHighlight?: never;
  readonly highlightPreTag?: never;
  readonly highlightPostTag?: never;
};
