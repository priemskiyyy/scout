import { ScoutError } from "@priemskiyyy/scout";

import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
import type { StorePages } from "examples/shared/outpost/types/StorePages";

/**
 * Where the store's search stands. A page Scout answered without asking the
 * engine has no native response, which is how a filter that matches nothing
 * shows itself.
 *
 * @example
 * ```ts
 * getSearchStatus(query); // "answered-by-scout"
 * ```
 */
export const getSearchStatus = (query: StorePages): SearchStatus => {
  if (query.error instanceof ScoutError) {
    return query.error.code;
  }

  if (query.error !== null) {
    return "provider";
  }

  if (query.data === undefined || query.isPlaceholderData) {
    return "searching";
  }

  const latest = query.data.pages.at(-1);

  if (latest?.native === null) {
    return "answered-by-scout";
  }

  return "answered";
};
