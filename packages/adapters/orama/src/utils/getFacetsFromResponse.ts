import type { AdapterFacet } from "@priemskiyyy/scout";

import type { OramaResponse } from "src/types/OramaResponse";

/**
 * Every facet one response counted, keyed by field. Orama keys each bucket by
 * the value's string, "true" and "false" for a boolean, and the core decodes
 * it to the type the index declared.
 *
 * @example
 * ```ts
 * getFacetsFromResponse(response).brand?.values; // [{ value: "Acme Audio", count: 2 }]
 * ```
 */
export const getFacetsFromResponse = (
  response: OramaResponse<unknown>,
): Readonly<Record<string, AdapterFacet>> => {
  const facets: Record<string, AdapterFacet> = {};

  for (const [field, result] of Object.entries(response.facets ?? {})) {
    const values = Object.entries(result.values).map(([value, count]) => ({
      value,
      count,
    }));

    facets[field] = {
      values,
      // Orama counts every distinct value, then returns at most ten of a
      // string property's, so a shorter list than the count was truncated.
      exhaustive: values.length === result.count,
      native: result,
    };
  }

  return facets;
};
