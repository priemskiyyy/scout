import type { AdapterSearchHit, HighlightMarkers } from "@priemskiyyy/scout";

import type { AlgoliaHit } from "src/types/AlgoliaHit";
import type { AlgoliaSearchResponse } from "src/types/AlgoliaSearchResponse";
import { HIT_METADATA_KEYS } from "src/utils/constants/hits";
import { getHighlightsFromHit } from "src/utils/getHighlightsFromHit";

/**
 * Every hit of one response. The document drops the metadata Algolia adds to
 * it, which stays on the whole hit kept as `native`.
 *
 * @example
 * ```ts
 * getHitsFromResponse(response, request.highlights, markers);
 * ```
 */
export const getHitsFromResponse = (
  response: AlgoliaSearchResponse,
  requested: readonly string[],
  markers: HighlightMarkers,
): readonly AdapterSearchHit<AlgoliaHit>[] =>
  response.hits.map((hit) => ({
    document: Object.fromEntries(
      Object.entries(hit).filter(([key]) => !HIT_METADATA_KEYS.includes(key)),
    ),
    highlights: getHighlightsFromHit(hit, requested, markers),
    native: hit,
  }));
