import type { SearchTotal, SearchTotalScope } from "@priemskiyyy/scout";

import type { AlgoliaSearchResponse } from "src/types/AlgoliaSearchResponse";

// Past the pagination window the count is of matches pagination cannot reach.
const getScope = (value: number, limit: number): SearchTotalScope => {
  if (value > limit) {
    return "matches";
  }

  return "retrievable";
};

/**
 * How many documents matched, and how sure Algolia is. Algolia approximates
 * `nbHits` past about 50ms or roughly 10,000 exact matches, and says so in
 * `exhaustive.nbHits`. A missing flag says nothing.
 *
 * @example
 * ```ts
 * getTotalEntriesCountFromResponse({ hits: [], nbHits: 2, exhaustive: { nbHits: true } }, 1000);
 * // { value: 2, accuracy: "exact", scope: "retrievable" }
 * ```
 */
export const getTotalEntriesCountFromResponse = (
  response: AlgoliaSearchResponse,
  paginationLimitedTo: number,
): SearchTotal => {
  const value = response.nbHits;

  if (value === undefined) {
    return { accuracy: "unknown", scope: "unknown" };
  }

  const scope = getScope(value, paginationLimitedTo);
  const exhaustive = response.exhaustive?.nbHits;

  if (exhaustive === undefined) {
    return { accuracy: "unknown", scope };
  }

  if (exhaustive) {
    return { value, accuracy: "exact", scope };
  }

  return { value, accuracy: "estimated", scope };
};
