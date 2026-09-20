/**
 * How one named profile queries the collection.
 *
 * @example
 * ```ts
 * const profile: TypesenseProfile = { queryBy: ["name", "brand"], prefix: true };
 * ```
 * @see [typesense adapter](https://priemskiyyy.github.io/scout/adapters.html#typesense)
 */
export type TypesenseProfile = {
  /** The fields the query text runs against, in `query_by` order. */
  queryBy: readonly string[];
  /** Whether the last token of the query may match a prefix. */
  prefix?: boolean;
};
