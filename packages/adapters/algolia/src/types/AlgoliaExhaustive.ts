/**
 * What Algolia reports about its own counting.
 *
 * @example
 * ```ts
 * const exhaustive: AlgoliaExhaustive = { nbHits: true, facetValues: false };
 * ```
 * @see [algolia adapter](https://priemskiyyy.github.io/scout/adapters.html#algolia)
 */
export type AlgoliaExhaustive = {
  nbHits?: boolean | undefined;
  facetsCount?: boolean | undefined;
  facetValues?: boolean | undefined;
  typo?: boolean | undefined;
  rulesMatch?: boolean | undefined;
};
