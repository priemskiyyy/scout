/**
 * One bucket of a Typesense facet. `value` is a string even for a number.
 *
 * @example
 * ```ts
 * const bucket: TypesenseFacetCount = { count: 12, value: "199" };
 * ```
 * @see [typesense adapter](https://priemskiyyy.github.io/scout/adapters.html#typesense)
 */
export type TypesenseFacetCount = {
  readonly count: number;
  readonly value: string;
};
