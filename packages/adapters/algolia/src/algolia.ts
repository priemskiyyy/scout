import { ScoutError } from "@priemskiyyy/scout";
import { createHighlightMarkers } from "@priemskiyyy/scout/adapter";

import type { AlgoliaAdapterOptions } from "src/types/AlgoliaAdapterOptions";
import type { AlgoliaSearchAdapter } from "src/types/AlgoliaSearchAdapter";
import { assertProfilesOmitReservedOptions } from "src/utils/assertProfilesOmitReservedOptions";
import {
  DEFAULT_PAGINATION_LIMIT,
  MAX_PAGE_SIZE,
} from "src/utils/constants/limits";
import { RESERVED_OPTIONS } from "src/utils/constants/parameters";
import { getFacetsFromResponse } from "src/utils/getFacetsFromResponse";
import { getHitsFromResponse } from "src/utils/getHitsFromResponse";
import { getIndexNameFromSort } from "src/utils/getIndexNameFromSort";
import { getSearchParameters } from "src/utils/getSearchParameters";
import { getSearchResponse } from "src/utils/getSearchResponse";
import { getTotalEntriesCountFromResponse } from "src/utils/getTotalEntriesCountFromResponse";

/**
 * Searches one Algolia index through a client the application owns. Each of
 * the index's sorts is served by a replica, because Algolia has no per search
 * sort. `@algolia/client-common` takes no signal, so an aborted search stops
 * Scout waiting while Algolia still answers, and bills, it.
 *
 * @example
 * ```ts
 * const adapter = algolia({
 *   client: algoliasearch(appId, searchOnlyKey),
 *   indexName: "products",
 *   replicas: { priceAsc: "products_price_asc" },
 *   profiles: { strict: { typoTolerance: false } },
 * });
 * ```
 */
// An overload rather than a cast: without replicas the adapter serves no
// sorts, and a generic default cannot build an empty record of the caller's
// sort names.
export function algolia<const TSortName extends string = never>(
  options: AlgoliaAdapterOptions<TSortName>,
): AlgoliaSearchAdapter<TSortName>;

export function algolia({
  client,
  indexName,
  replicas = {},
  profiles,
  cache = false,
  paginationLimitedTo = DEFAULT_PAGINATION_LIMIT,
}: AlgoliaAdapterOptions<string>): AlgoliaSearchAdapter<string> {
  assertProfilesOmitReservedOptions(profiles ?? {});

  return {
    name: "algolia",
    native: client,
    // The same sort over a different replica is a different result set. An
    // API key never appears here, because the fingerprint reaches cache keys.
    fingerprint: () =>
      [
        indexName,
        ...Object.entries(replicas).map(
          ([name, replica]) => `${name}=${replica}`,
        ),
      ].join(" "),
    sorts: replicas,
    profiles,
    reservedOptions: RESERVED_OPTIONS,
    search: async (request) => {
      if (request.page.size > MAX_PAGE_SIZE) {
        throw new ScoutError({
          code: "unsupported-feature",
          message: `Algolia returns at most ${MAX_PAGE_SIZE} hits a page.`,
        });
      }

      // Made for this search, so no document can be written to contain them.
      const markers = createHighlightMarkers();

      const response = await getSearchResponse(client, cache, {
        indexName: getIndexNameFromSort(indexName, replicas, request.sort),
        searchParams: getSearchParameters(
          request,
          profiles?.[request.profile],
          markers,
        ),
      });

      return {
        hits: getHitsFromResponse(response, request.highlights, markers),
        total: getTotalEntriesCountFromResponse(response, paginationLimitedTo),
        facets: getFacetsFromResponse(response, request.facets),
        took: response.processingTimeMS ?? null,
        retrievable: paginationLimitedTo,
        native: response,
      };
    },
  };
}
