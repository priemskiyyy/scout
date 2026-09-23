import type { AdapterFacet } from "@priemskiyyy/scout";

import type { MongoSearchRow } from "src/types/MongoSearchRow";

/**
 * Every facet one search counted, keyed by field, from the metadata every row
 * carries. MongoDB Search never says whether a facet left values out, so
 * none is known to be exhaustive.
 *
 * @example
 * ```ts
 * getFacetsFromRows(rows).brand?.values; // [{ value: "Acme", count: 12 }]
 * ```
 */
export const getFacetsFromRows = (
  rows: readonly MongoSearchRow[],
): Readonly<Record<string, AdapterFacet>> => {
  const facets: Record<string, AdapterFacet> = {};

  for (const [field, facet] of Object.entries(
    rows[0]?.__scout.meta.facet ?? {},
  )) {
    facets[field] = {
      values: facet.buckets.map(({ _id, count }) => ({ value: _id, count })),
      exhaustive: "unknown",
      native: facet,
    };
  }

  return facets;
};
