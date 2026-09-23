import type { AdapterFacet } from "@priemskiyyy/scout";

import type { TypesenseSearchResponse } from "src/types/TypesenseSearchResponse";

/**
 * Every facet one response counted, keyed by field. Typesense reports each
 * value as a string, and the core decodes it to the type the index declared.
 *
 * @example
 * ```ts
 * getFacetsFromResponse(response).brand?.values; // [{ value: "Acme", count: 12 }]
 * ```
 */
export const getFacetsFromResponse = (
  response: TypesenseSearchResponse,
): Readonly<Record<string, AdapterFacet>> => {
  const facets: Record<string, AdapterFacet> = {};

  for (const counts of response.facet_counts ?? []) {
    facets[String(counts.field_name)] = {
      values: counts.counts.map(({ value, count }) => ({ value, count })),
      // `sampled` admits a sample was counted, the inverse of exhaustive.
      exhaustive: !counts.sampled,
      native: counts,
    };
  }

  return facets;
};
