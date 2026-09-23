import type { AlgoliaSearchClient } from "src/types/AlgoliaSearchClient";
import type { AlgoliaSearchProps } from "src/types/AlgoliaSearchProps";
import type { AlgoliaSearchResponse } from "src/types/AlgoliaSearchResponse";

/**
 * Algolia's answer to one search. `searchSingleIndex` marks every search
 * `cacheable: true`, and the transporter reads
 * `requestOptions.cacheable || request.cacheable`, so no request can opt out
 * of the client's caches. The HTTP info variant never consults either, so it
 * answers unless the application asked for the caches.
 *
 * @example
 * ```ts
 * const response = await getSearchResponse(client, false, { indexName, searchParams });
 * ```
 */
export const getSearchResponse = async (
  client: AlgoliaSearchClient,
  cache: boolean,
  props: AlgoliaSearchProps,
): Promise<AlgoliaSearchResponse> => {
  if (cache) {
    return await client.searchSingleIndex(props);
  }

  const answer = await client.searchSingleIndexWithHTTPInfo(props);

  return answer.data;
};
