import { ScoutError } from "@priemskiyyy/scout";

import type { MiniSearchAdapter } from "src/types/MiniSearchAdapter";
import type { MiniSearchOptions } from "src/types/MiniSearchOptions";
import { RESERVED_OPTIONS } from "src/utils/constants/parameters";
import { getDocumentFromResult } from "src/utils/getDocumentFromResult";
import { getPageHitsFromMatches } from "src/utils/getPageHitsFromMatches";
import { getResultsFromIndex } from "src/utils/getResultsFromIndex";
import { getSearchOptions } from "src/utils/getSearchOptions";
import { getSortedMatches } from "src/utils/getSortedMatches";
import { getTotalEntriesCountFromResults } from "src/utils/getTotalEntriesCountFromResults";

/**
 * Searches a MiniSearch instance the application owns. MiniSearch answers with
 * every match, so filters, sorts and totals cover all of them before a page is
 * cut. It has no facets and no match offsets, so both are refused.
 *
 * @example
 * ```ts
 * const adapter = minisearch({
 *   index: catalogue,
 *   wildcard: MiniSearch.wildcard,
 *   revision: () => catalogueVersion,
 *   profiles: { titles: { prefix: true } },
 * });
 * ```
 */
export const minisearch = <TWildcard extends symbol = never>({
  index,
  wildcard,
  revision,
  resolve,
  profiles,
}: MiniSearchOptions<TWildcard>): MiniSearchAdapter => ({
  name: "minisearch",
  native: index,
  // The corpus decides the results without being part of the request.
  fingerprint: () => `minisearch:${String(revision())}`,
  profiles,
  reservedOptions: RESERVED_OPTIONS,
  search: (request) => {
    if (request.facets.length > 0) {
      throw new ScoutError({
        code: "unsupported-feature",
        message:
          "MiniSearch has no facet index, so counts could only come from " +
          "tallying every match on every search.",
      });
    }

    if (request.highlights.length > 0) {
      throw new ScoutError({
        code: "unsupported-feature",
        message:
          "MiniSearch reports which fields a term matched, never where in " +
          "the text, so highlight parts could only be guessed.",
      });
    }

    const results = getResultsFromIndex(
      index,
      wildcard,
      request.query,
      getSearchOptions(request, profiles?.[request.profile], resolve),
    );

    const matches = getSortedMatches(
      results.map((result) => ({
        result,
        document: getDocumentFromResult(result, resolve),
      })),
      request.sort,
    );

    return {
      hits: getPageHitsFromMatches(matches, request.page),
      total: getTotalEntriesCountFromResults(results),
      facets: {},
      // MiniSearch reports no time of its own, so the core measures the call.
      took: null,
      native: results,
    };
  },
});
