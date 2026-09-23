import type { SearchTotal } from "@priemskiyyy/scout";

import type { OramaResponse } from "src/types/OramaResponse";

/**
 * How many documents matched. Orama counts every match of the search it ran
 * in process, and pages the whole set, so the count is exact.
 *
 * @example
 * ```ts
 * getTotalEntriesCountFromResponse(response);
 * // { value: 6, accuracy: "exact", scope: "matches" }
 * ```
 */
export const getTotalEntriesCountFromResponse = (
  response: OramaResponse<unknown>,
): SearchTotal => ({
  value: response.count,
  accuracy: "exact",
  scope: "matches",
});
