import type { AdapterSearchHit, HighlightMarkers } from "@priemskiyyy/scout";

import type { ElasticHit } from "src/types/ElasticHit";
import type { ElasticSearchResponseBody } from "src/types/ElasticSearchResponseBody";
import { getHighlightsFromHit } from "src/utils/getHighlightsFromHit";

/**
 * Every hit of one answer: its `_source` as the document, its requested
 * highlights, and the whole hit, `_id` and `_score` among it, as `native`.
 *
 * @example
 * ```ts
 * getHitsFromResponse(body, request.highlights, markers);
 * ```
 */
export const getHitsFromResponse = (
  body: ElasticSearchResponseBody,
  requested: readonly string[],
  markers: HighlightMarkers,
): readonly AdapterSearchHit<ElasticHit>[] =>
  body.hits.hits.map((hit) => ({
    document: hit._source,
    highlights: getHighlightsFromHit(hit, requested, markers),
    native: hit,
  }));
