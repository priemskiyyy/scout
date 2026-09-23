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

import type { OpenSearchAdapterOptions } from "src/types/OpenSearchAdapterOptions";
import type { OpenSearchSearchAdapter } from "src/types/OpenSearchSearchAdapter";

/**
 * Searches one OpenSearch index through a client the application owns. The
 * filter becomes a JSON `bool` query, facets become terms aggregations, and
 * highlights are split on markers made for each search.
 *
 * @example
 * ```ts
 * const scout = new Scout({
 *   indexes: { products },
 *   adapters: {
 *     products: opensearch({ client, index: "products", keywords: { brand: "brand.keyword" } }),
 *   },
 * });
 * ```
 * @see [opensearch adapter](https://priemskiyyy.github.io/scout/adapters.html#opensearch)
 */
export const opensearch = ({
  client,
  index,
  maxResultWindow = DEFAULT_MAX_RESULT_WINDOW,
  ...settings
}: OpenSearchAdapterOptions): OpenSearchSearchAdapter => ({
  name: "opensearch",
  native: client,
  fingerprint: () => index,
  reservedOptions: RESERVED_OPTIONS,
  search: async (request, { signal }) => {
    const { current, size } = request.page;

    // A page ends at `from + size`, which the engine refuses past the window.
    if (current * size > maxResultWindow) {
      throw new ScoutError({
        code: "unsupported-feature",
        message: `OpenSearch pages no further than max_result_window, ${maxResultWindow} hits, and page ${current} of ${size} ends at hit ${current * size}.`,
      });
    }

    const markers = createHighlightMarkers();

    const pending = client.search({
      index,
      body: getSearchBody(request, settings, markers),
    });

    // The client takes no signal, so the request is aborted through the
    // promise it returned.
    const handleAbort = () => pending.abort();

    signal.addEventListener("abort", handleAbort, { once: true });

    try {
      const { body } = await pending;

      return {
        hits: getHitsFromResponse(body, request.highlights, markers),
        total: getTotalEntriesCountFromResponse(body),
        facets: getFacetsFromResponse(body),
        took: body.took,
        retrievable: maxResultWindow,
        native: body,
      };
    } finally {
      signal.removeEventListener("abort", handleAbort);
    }
  },
});
