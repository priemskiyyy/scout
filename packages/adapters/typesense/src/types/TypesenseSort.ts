/**
 * How one named sort orders the collection.
 *
 * @example
 * ```ts
 * const priceAsc: TypesenseSort = { sortBy: "price:asc" };
 * ```
 * @see [typesense adapter](https://priemskiyyy.github.io/scout/adapters.html#typesense)
 */
export type TypesenseSort = {
  /** A Typesense `sort_by` expression. Absent leaves the engine's ranking. */
  sortBy?: string;
};
