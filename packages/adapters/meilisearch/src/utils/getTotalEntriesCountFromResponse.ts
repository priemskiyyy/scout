import type { SearchTotal } from "@priemskiyyy/scout";

import type { MeilisearchSearchResponse } from "src/types/MeilisearchSearchResponse";

/**
 * How many documents matched, and how sure Meilisearch is: page mode counts
 * exhaustively up to `maxTotalHits`, and offset mode estimates.
 *
 * @example
 * ```ts
 * getTotalEntriesCountFromResponse({ hits: [], totalHits: 5 }, "page", 1000);
 * // { value: 5, accuracy: "exact", scope: "matches" }
 * ```
 */
export const getTotalEntriesCountFromResponse = (
  response: MeilisearchSearchResponse,
  pagination: "page" | "offset",
  maxTotalHits: number,
): SearchTotal => {
  if (pagination === "offset") {
    if (typeof response.estimatedTotalHits !== "number") {
      return { accuracy: "unknown", scope: "unknown" };
    }

    // Offset pagination reports an estimate by design, however small the
    // number is, so it is never promoted to exact.
    return {
      value: response.estimatedTotalHits,
      accuracy: "estimated",
      scope: "matches",
    };
  }

  if (typeof response.totalHits !== "number") {
    return { accuracy: "unknown", scope: "unknown" };
  }

  // Page pagination counts exhaustively up to maxTotalHits and then stops, so
  // a total that reaches the cap says what paging can reach rather than how
  // many documents matched.
  if (response.totalHits >= maxTotalHits) {
    return {
      value: response.totalHits,
      accuracy: "lower-bound",
      scope: "retrievable",
    };
  }

  return { value: response.totalHits, accuracy: "exact", scope: "matches" };
};
