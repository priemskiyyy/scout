/**
 * What `$$SEARCH_META` holds for one search: its count, and the buckets of
 * every facet it asked for, keyed by facet name.
 *
 * @example
 * ```ts
 * const meta: MongoSearchMeta = { count: { lowerBound: 12 } };
 * ```
 * @see [mongodb adapter](https://priemskiyyy.github.io/scout/adapters.html#mongodb-search)
 */
export type MongoSearchMeta = {
  readonly count?: { readonly total?: number; readonly lowerBound?: number };
  readonly facet?: Readonly<
    Record<
      string,
      {
        readonly buckets: readonly {
          readonly _id: string;
          readonly count: number;
        }[];
      }
    >
  >;
};
