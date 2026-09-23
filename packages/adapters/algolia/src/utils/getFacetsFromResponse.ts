import type { AdapterFacet } from "@priemskiyyy/scout";

import type { AlgoliaSearchResponse } from "src/types/AlgoliaSearchResponse";

/**
 * Every requested facet one response counted, keyed by field. Algolia sends
 * facet values as the strings it indexed, and the core decodes each one to the
 * type the index declared. A facet Algolia did not return is left out, so the
 * core reports it unknown rather than empty.
 *
 * @example
 * ```ts
 * getFacetsFromResponse(response, ["brand"]).brand?.values; // [{ value: "acme", count: 2 }]
 * ```
 */
export const getFacetsFromResponse = (
  response: AlgoliaSearchResponse,
  requested: readonly string[],
): Readonly<Record<string, AdapterFacet>> => {
  const facets: Record<string, AdapterFacet> = {};
  const exhaustive = response.exhaustive?.facetValues;

  for (const field of requested) {
    const buckets = response.facets?.[field];

    if (buckets === undefined) {
      continue;
    }

    facets[field] = {
      values: Object.entries(buckets).map(([value, count]) => ({
        value,
        count,
      })),
      exhaustive: exhaustive ?? "unknown",
      native: buckets,
    };
  }

  return facets;
};
