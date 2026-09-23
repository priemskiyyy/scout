import type { SearchTotal } from "@priemskiyyy/scout";

import type { TypesenseSearchResponse } from "src/types/TypesenseSearchResponse";

/**
 * How many documents matched, and how sure Typesense is. `search_cutoff`
 * means it stopped counting early. Typesense pages the whole match set, so
 * every counted match is reachable.
 *
 * @example
 * ```ts
 * getTotalEntriesCountFromResponse({ found: 3, page: 1 });
 * // { value: 3, accuracy: "exact", scope: "matches" }
 * ```
 */
export const getTotalEntriesCountFromResponse = (
  response: TypesenseSearchResponse,
): SearchTotal => {
  if (response.search_cutoff === true) {
    return { value: response.found, accuracy: "estimated", scope: "matches" };
  }

  return { value: response.found, accuracy: "exact", scope: "matches" };
};
