import type { AdapterFacet } from "@priemskiyyy/scout";

import type { ScoutWireResponse } from "src/types/ScoutWireResponse";

/**
 * Every facet the backend counted, keyed by field, with its values as the
 * backend stores them. The core decodes each one to the type the index
 * declared, and an exhaustiveness the backend never claimed is unknown.
 *
 * @example
 * ```ts
 * getFacetsFromResponse({ hits: [], facets: { brand: { values: [{ value: "Apex", count: 2 }] } } });
 * // { brand: { values: [{ value: "Apex", count: 2 }], exhaustive: "unknown", native: ... } }
 * ```
 */
export const getFacetsFromResponse = (
  response: ScoutWireResponse,
): Readonly<Record<string, AdapterFacet>> => {
  const facets: Record<string, AdapterFacet> = {};

  for (const [field, facet] of Object.entries(response.facets ?? {})) {
    facets[field] = {
      values: facet.values,
      exhaustive: facet.exhaustive ?? "unknown",
      native: facet,
    };
  }

  return facets;
};
