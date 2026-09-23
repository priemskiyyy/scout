import type { SearchFacet } from "@priemskiyyy/scout";

/**
 * A value's count, or what can honestly stand in for one. A value missing
 * from an exhaustive facet has no match; missing from a sampled one it may.
 *
 * @example
 * ```ts
 * formatFacetCount(facet, "Tern"); // "3", "0" or "–"
 * ```
 */
export const formatFacetCount = (
  facet: SearchFacet<string | boolean> | null,
  value: string | boolean,
) => {
  if (facet === null) {
    return null;
  }

  const bucket = facet.values.find((candidate) => candidate.value === value);

  if (bucket !== undefined) {
    return String(bucket.count);
  }

  if (facet.exhaustive === true) {
    return "0";
  }

  return "–";
};
