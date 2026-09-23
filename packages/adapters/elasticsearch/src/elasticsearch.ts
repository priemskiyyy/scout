import { ScoutError } from "@priemskiyyy/scout";
import { createHighlightMarkers } from "@priemskiyyy/scout/adapter";
import {
  DEFAULT_MAX_RESULT_WINDOW,
  RESERVED_OPTIONS,
  getFacetsFromResponse,
  getHitsFromResponse,
  getSearchBody,
  getTotalEntriesCountFromResponse,
} from "@priemskiyyy/scout-elastic-dsl";

import type { ElasticsearchAdapterOptions } from "src/types/ElasticsearchAdapterOptions";
import type { ElasticsearchSearchAdapter } from "src/types/ElasticsearchSearchAdapter";

/**
 * Searches one Elasticsearch index through a client the application owns.
 * The filter becomes a JSON `bool` query, facets become terms aggregations,
 * and highlights are split on markers made for each search.
 *
 * @example
 * ```ts
 * const scout = new Scout({
 *   indexes: { products },
 *   adapters: {
 *     products: elasticsearch({ client, index: "products", keywords: { brand: "brand.keyword" } }),
 *   },
 * });
 * ```
 * @see [elasticsearch adapter](https://priemskiyyy.github.io/scout/adapters.html#elasticsearch)
 */
export const elasticsearch = ({
  client,
  index,
  maxResultWindow = DEFAULT_MAX_RESULT_WINDOW,
  ...settings
}: ElasticsearchAdapterOptions): ElasticsearchSearchAdapter => ({
  name: "elasticsearch",
  native: client,
  fingerprint: () => index,
  reservedOptions: RESERVED_OPTIONS,
  search: async (request, { signal }) => {
    const { current, size } = request.page;

    // A page ends at `from + size`, which the engine refuses past the window.
    if (current * size > maxResultWindow) {
      throw new ScoutError({
        code: "unsupported-feature",
        message: `Elasticsearch pages no further than max_result_window, ${maxResultWindow} hits, and page ${current} of ${size} ends at hit ${current * size}.`,
      });
    }

    const markers = createHighlightMarkers();

    const body = await client.search(
      { index, ...getSearchBody(request, settings, markers) },
      { signal },
    );

    return {
      hits: getHitsFromResponse(body, request.highlights, markers),
      total: getTotalEntriesCountFromResponse(body),
      facets: getFacetsFromResponse(body),
      took: body.took,
      retrievable: maxResultWindow,
      native: body,
    };
  },
});
