import { ScoutError } from "@priemskiyyy/scout";
import { createHighlightMarkers } from "@priemskiyyy/scout/adapter";

import type { TypesenseAdapterOptions } from "src/types/TypesenseAdapterOptions";
import type { TypesenseSearchAdapter } from "src/types/TypesenseSearchAdapter";
import { MAX_PAGE_SIZE } from "src/utils/constants/limits";
import { RESERVED_OPTIONS } from "src/utils/constants/parameters";
import { getFacetsFromResponse } from "src/utils/getFacetsFromResponse";
import { getHitsFromResponse } from "src/utils/getHitsFromResponse";
import { getSearchParameters } from "src/utils/getSearchParameters";
import { getTotalEntriesCountFromResponse } from "src/utils/getTotalEntriesCountFromResponse";

/**
 * Searches one Typesense collection through a client the application owns.
 *
 * @example
 * ```ts
 * const adapter = typesense({
 *   client: new Typesense.SearchClient({ nodes, apiKey: searchOnlyKey }),
 *   collection: "products",
 *   profiles: { exact: { prefix: false } },
 * });
 * ```
 */
export const typesense = ({
  client,
  collection,
  profiles,
}: TypesenseAdapterOptions): TypesenseSearchAdapter => ({
  name: "typesense",
  native: client,
  // The collection decides the results without being part of the request. An
  // API key never appears here, because the fingerprint reaches cache keys.
  fingerprint: () => collection,
  profiles,
  reservedOptions: RESERVED_OPTIONS,
  search: async (request, { signal }) => {
    if (request.page.size > MAX_PAGE_SIZE) {
      throw new ScoutError({
        code: "unsupported-feature",
        message: `Typesense returns at most ${MAX_PAGE_SIZE} hits a page.`,
      });
    }

    if (
      request.provider !== null &&
      Object.hasOwn(request.provider, "group_by")
    ) {
      throw new ScoutError({
        code: "unsupported-feature",
        message:
          "Typesense answers a grouped search with grouped_hits, a result " +
          "shape Scout does not map. Reach the client through the index's " +
          "native handle for one.",
      });
    }

    // Made for this search, so no document can be written to contain them.
    const markers = createHighlightMarkers();

    const response = await client
      .collections(collection)
      .documents()
      .search(
        getSearchParameters(request, profiles?.[request.profile], markers),
        {
          abortSignal: signal,
        },
      );

    // A preset can turn grouping on without the search asking for it.
    if (response.grouped_hits !== undefined) {
      throw new ScoutError({
        code: "unsupported-feature",
        message:
          "Typesense answered with grouped_hits, so a preset turned grouping " +
          "on. Scout does not map a grouped result.",
      });
    }

    return {
      hits: getHitsFromResponse(response, request.highlights, markers),
      total: getTotalEntriesCountFromResponse(response),
      facets: getFacetsFromResponse(response),
      took: response.search_time_ms ?? null,
      native: response,
    };
  },
});
