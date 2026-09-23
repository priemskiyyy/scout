import type { AdapterFacet } from "@priemskiyyy/scout";

import type { MeilisearchSearchResponse } from "src/types/MeilisearchSearchResponse";

/**
 * Every requested facet one response counted, keyed by field, with its stats
 * kept on `native`. Meilisearch reports every facet value as a string, and
 * the core decodes it to the type the index declared.
 *
 * @example
 * ```ts
 * getFacetsFromResponse(response, ["brand"]).brand?.values; // [{ value: "Apex", count: 2 }]
 * ```
 */
export const getFacetsFromResponse = (
  response: MeilisearchSearchResponse,
  requested: readonly string[],
): Readonly<Record<string, AdapterFacet>> => {
  const stats = new Map(Object.entries(response.facetStats ?? {}));

  return Object.fromEntries(
    Object.entries(response.facetDistribution ?? {})
      .filter(([field]) => requested.includes(field))
      .map(([field, distribution]) => [
        field,
        {
          values: Object.entries(distribution).map(([value, count]) => ({
            value,
            count,
          })),
          // Meilisearch never says whether maxValuesPerFacet cut a
          // distribution short, so completeness is not claimed.
          exhaustive: "unknown",
          native: { distribution, stats: stats.get(field) ?? null },
        },
      ]),
  );
};
