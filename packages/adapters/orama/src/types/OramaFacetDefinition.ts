/**
 * One facet definition. Orama wants an object per faceted property, and the
 * portable request carries no knobs to put in it.
 *
 * @example
 * ```ts
 * const facet: OramaFacetDefinition = { limit: 50 };
 * ```
 * @see [orama adapter](https://priemskiyyy.github.io/scout/adapters.html#orama)
 */
export type OramaFacetDefinition = {
  readonly limit?: number;
};
