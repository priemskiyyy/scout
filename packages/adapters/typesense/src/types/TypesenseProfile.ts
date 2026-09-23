/**
 * How Typesense tunes one of the index's profiles. The fields a profile
 * searches come from the index.
 *
 * @example
 * ```ts
 * const exact: TypesenseProfile = { prefix: false };
 * ```
 * @see [typesense adapter](https://priemskiyyy.github.io/scout/adapters.html#typesense)
 */
export type TypesenseProfile = {
  /** Whether the last token of the query may match a prefix. Typesense defaults to true. */
  prefix?: boolean;
};
