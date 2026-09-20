/**
 * One facet bucket. `value` carries the schema field's own type, so a numeric
 * facet arrives as a number even when the engine reported it as a string.
 *
 * @example
 * ```ts
 * const bucket: SearchFacetValue<number> = { value: 199, count: 3 };
 * ```
 *
 * @see [SearchFacet usage](https://priemskiyyy.github.io/scout/facets.html)
 */
export type SearchFacetValue<TValue> = {
  readonly value: TValue;
  readonly count: number;
};
