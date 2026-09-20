/**
 * The search Orama is asked for, limited to the portable keyword subset. There
 * is no vector, hybrid or embedding field here, because none of them is
 * reached from the portable contract.
 *
 * Orama types `where`, `facets`, `sortBy` and `boost` against the schema of the
 * database being searched, so no schema independent declaration of them is
 * assignable to Orama's own. They are `unknown` here so that Orama's `search`
 * is accepted as it is, and the adapter builds each of them as `OramaWhere`,
 * `OramaFacetDefinition` and `OramaSearchSort` before it widens them.
 * `orama.contracts.ts` pins those shapes against the real Orama types.
 *
 * @example
 * ```ts
 * const params: OramaSearchParams = { term: "shoe", limit: 20, offset: 0 };
 * ```
 * @see [orama adapter](https://priemskiyyy.github.io/scout/adapters.html#orama)
 */
export type OramaSearchParams = {
  term?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
  properties?: "*" | readonly string[] | undefined;
  tolerance?: number | undefined;
  threshold?: number | undefined;
  where?: unknown;
  facets?: unknown;
  sortBy?: unknown;
  boost?: unknown;
};
