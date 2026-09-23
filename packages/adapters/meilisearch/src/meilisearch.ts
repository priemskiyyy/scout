import { ScoutError } from "@priemskiyyy/scout";
import { createHighlightMarkers } from "@priemskiyyy/scout/adapter";

import type { MeilisearchAdapterOptions } from "src/types/MeilisearchAdapterOptions";
import type { MeilisearchSearchAdapter } from "src/types/MeilisearchSearchAdapter";
import { DEFAULT_MAX_TOTAL_HITS } from "src/utils/constants/limits";
import { RESERVED_OPTIONS } from "src/utils/constants/parameters";
import { getFacetsFromResponse } from "src/utils/getFacetsFromResponse";
import { getHighlightTruncationFromParameters } from "src/utils/getHighlightTruncationFromParameters";
import { getHitsFromResponse } from "src/utils/getHitsFromResponse";
import { getSearchParameters } from "src/utils/getSearchParameters";
import { getTotalEntriesCountFromResponse } from "src/utils/getTotalEntriesCountFromResponse";

/**
 * Searches one Meilisearch index through a client the application owns.
 * Page mode reports a capped count as a lower bound, and offset mode reports
 * an estimate.
 *
 * @example
 * ```ts
 * const adapter = meilisearch({
 *   index: new Meilisearch({ host, apiKey: searchKey }).index("products"),
 *   profiles: { names: { matchingStrategy: "all" } },
 * });
 * ```
 */
export const meilisearch = ({
  index,
  profiles,
  pagination = "page",
  maxTotalHits = DEFAULT_MAX_TOTAL_HITS,
}: MeilisearchAdapterOptions): MeilisearchSearchAdapter => ({
  name: "meilisearch",
  native: index,
  // The index uid decides the results without being part of the request. An
  // API key never appears here, because the fingerprint reaches cache keys.
  fingerprint: () => index.uid,
  profiles,
  reservedOptions: RESERVED_OPTIONS,
  search: async (request, { signal }) => {
    // Meilisearch pages no further than maxTotalHits, so that is the largest
    // page it can fill.
    if (request.page.size > maxTotalHits) {
      throw new ScoutError({
        code: "unsupported-feature",
        message: `Meilisearch fills at most ${maxTotalHits} hits a page, the index's pagination.maxTotalHits.`,
      });
    }

    // Made for this search, so no document can be written to contain them.
    const markers = createHighlightMarkers();

    const params = getSearchParameters(
      request,
      profiles?.[request.profile],
      pagination,
      markers,
    );

    const response = await index.search(request.query, params, { signal });

    return {
      hits: getHitsFromResponse(
        response,
        request.highlights,
        markers,
        getHighlightTruncationFromParameters(params),
      ),
      total: getTotalEntriesCountFromResponse(
        response,
        pagination,
        maxTotalHits,
      ),
      facets: getFacetsFromResponse(response, request.facets),
      took: response.processingTimeMs ?? null,
      native: response,
    };
  },
});
