/**
 * One named sort. Algolia implements alternative sorting with replica indexes
 * rather than a per request sort parameter, so a Scout sort name is an index
 * name: the primary index for the relevance sort, a replica for any other.
 *
 * @example
 * ```ts
 * const priceAsc: AlgoliaSort = { index: { name: "products_price_asc" } };
 * ```
 * @see [algolia adapter](https://priemskiyyy.github.io/scout/adapters.html#algolia)
 */
export type AlgoliaSort = {
  index: { name: string };
};
