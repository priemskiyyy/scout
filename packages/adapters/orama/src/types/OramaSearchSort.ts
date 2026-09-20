/**
 * One named sort. Leaving `sortBy` out keeps Orama's relevance order.
 *
 * @example
 * ```ts
 * const priceAsc: OramaSearchSort = { sortBy: { property: "price", order: "ASC" } };
 * ```
 * @see [orama adapter](https://priemskiyyy.github.io/scout/adapters.html#orama)
 */
export type OramaSearchSort = {
  sortBy?: { readonly property: string; readonly order?: "ASC" | "DESC" };
};
