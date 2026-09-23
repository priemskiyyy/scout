import type { SearchTotal } from "@priemskiyyy/scout";

import type { MiniSearchResult } from "src/types/MiniSearchResult";

/**
 * How many documents matched. MiniSearch answers with every match, already
 * filtered, so the count is exact and every one of them is reachable.
 *
 * @example
 * ```ts
 * getTotalEntriesCountFromResults(results); // { value: 5, accuracy: "exact", scope: "matches" }
 * ```
 */
export const getTotalEntriesCountFromResults = (
  results: readonly MiniSearchResult[],
): SearchTotal => ({
  value: results.length,
  accuracy: "exact",
  scope: "matches",
});
