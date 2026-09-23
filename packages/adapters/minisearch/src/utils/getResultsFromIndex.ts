import { ScoutError } from "@priemskiyyy/scout";

import type { MiniSearchIndex } from "src/types/MiniSearchIndex";
import type { MiniSearchResult } from "src/types/MiniSearchResult";
import type { MiniSearchSearchOptions } from "src/types/MiniSearchSearchOptions";

/**
 * Every result MiniSearch has for one query. MiniSearch finds nothing for an
 * empty string, so a browse runs the wildcard instead.
 *
 * @example
 * ```ts
 * getResultsFromIndex(catalogue, MiniSearch.wildcard, "", { fields: ["title"] });
 * ```
 */
export const getResultsFromIndex = <TWildcard extends symbol>(
  index: MiniSearchIndex<TWildcard>,
  wildcard: TWildcard | undefined,
  query: string,
  options: MiniSearchSearchOptions,
): readonly MiniSearchResult[] => {
  if (query !== "") {
    return index.search(query, options);
  }

  if (wildcard === undefined) {
    throw new ScoutError({
      code: "unsupported-feature",
      message:
        "MiniSearch browses through MiniSearch.wildcard, from minisearch " +
        "7.2. Pass it as the wildcard option to search with an empty query.",
    });
  }

  return index.search(wildcard, options);
};
