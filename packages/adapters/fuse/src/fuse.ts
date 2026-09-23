import { ScoutError } from "@priemskiyyy/scout";
import { matchesFilter } from "@priemskiyyy/scout/adapter";

import type { FuseAdapterOptions } from "src/types/FuseAdapterOptions";
import type { FuseSearchAdapter } from "src/types/FuseSearchAdapter";
import { getHitsFromMatches } from "src/utils/getHitsFromMatches";
import { getQueryFromRequest } from "src/utils/getQueryFromRequest";
import { getSortedHits } from "src/utils/getSortedHits";

/**
 * Searches a Fuse instance the application owns. Fuse returns every match, so
 * the adapter filters, sorts and pages the whole set in process, and the total
 * is exact.
 *
 * @example
 * ```ts
 * const adapter = fuse({
 *   index: new Fuse(products, { keys: ["name", "tags"], includeMatches: true }),
 *   revision: () => catalogueVersion,
 * });
 * ```
 */
export const fuse = <TDocument>({
  index,
  revision,
}: FuseAdapterOptions<TDocument>): FuseSearchAdapter<TDocument> => ({
  name: "fuse",
  native: index,
  fingerprint: () => `fuse:${String(revision())}`,
  search: (request) => {
    if (request.facets.length > 0) {
      throw new ScoutError({
        code: "unsupported-feature",
        message: "Fuse has no facet index, so it cannot count facet values.",
      });
    }

    if (request.highlights.length > 0 && !index.options.includeMatches) {
      throw new ScoutError({
        code: "unsupported-feature",
        message:
          "Fuse reports match ranges only when it is built with includeMatches, so it cannot highlight.",
      });
    }

    const native = index.search(getQueryFromRequest(index, request));

    // Filtered and sorted over every match before a page is cut, so the total
    // is exact and every matching document stays reachable.
    const matches = getSortedHits(
      native.filter((hit) => matchesFilter(request.filter, hit.item)),
      request.sort,
    );

    return {
      hits: getHitsFromMatches(matches, request.page, request.highlights),
      total: { value: matches.length, accuracy: "exact", scope: "matches" },
      facets: {},
      took: null,
      native,
    };
  },
});
