import type { AdapterSearchRequest } from "@priemskiyyy/scout";
import { matchesFilter } from "@priemskiyyy/scout/adapter";

import type { MiniSearchOptions } from "src/types/MiniSearchOptions";
import type { MiniSearchProfile } from "src/types/MiniSearchProfile";
import type { MiniSearchSearchOptions } from "src/types/MiniSearchSearchOptions";
import { getDocumentFromResult } from "src/utils/getDocumentFromResult";

/**
 * The options one search passes to MiniSearch: the profile's tuning, the
 * provider options over it, the fields the profile searches, and a predicate
 * built from the filter.
 *
 * @example
 * ```ts
 * const options = getSearchOptions(request, profiles?.[request.profile], resolve);
 * ```
 */
export const getSearchOptions = (
  request: AdapterSearchRequest<MiniSearchProfile>,
  profile: MiniSearchProfile | undefined,
  resolve: MiniSearchOptions["resolve"],
): MiniSearchSearchOptions => {
  const options: MiniSearchSearchOptions = {
    ...profile,
    ...request.provider,
    fields: [...request.searchable],
  };

  const { filter } = request;

  // MiniSearch runs the predicate over every match before answering, so the
  // total it reports is already the filtered one.
  if (filter !== null) {
    options.filter = (result) =>
      matchesFilter(filter, getDocumentFromResult(result, resolve));
  }

  return options;
};
