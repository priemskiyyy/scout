/**
 * One field's buckets as Orama reports them. `count` is how many distinct
 * values it counted, which is not always how many it returned: a string facet
 * is truncated to Orama's own limit afterwards.
 *
 * @example
 * ```ts
 * const facet: OramaFacetResult = { count: 2, values: { Acme: 12, North: 8 } };
 * ```
 * @see [orama adapter](https://priemskiyyy.github.io/scout/adapters.html#orama)
 */
export type OramaFacetResult = {
  count: number;
  values: Readonly<Record<string, number>>;
};
