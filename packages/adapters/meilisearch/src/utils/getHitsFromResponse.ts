import type { AdapterSearchHit, HighlightMarkers } from "@priemskiyyy/scout";

import type { MeilisearchSearchHit } from "src/types/MeilisearchSearchHit";
import type { MeilisearchSearchResponse } from "src/types/MeilisearchSearchResponse";
import { HIT_METADATA_KEYS } from "src/utils/constants/parameters";
import { getHighlightFragmentsFromHit } from "src/utils/getHighlightFragmentsFromHit";

/**
 * Every hit of one response: its document without the keys Meilisearch adds,
 * its requested highlights, and the whole Meilisearch hit kept as `native`.
 *
 * @example
 * ```ts
 * getHitsFromResponse(response, request.highlights, markers, false);
 * ```
 */
export const getHitsFromResponse = (
  response: MeilisearchSearchResponse,
  requested: readonly string[],
  markers: HighlightMarkers,
  truncated: boolean | "unknown",
): readonly AdapterSearchHit<MeilisearchSearchHit>[] =>
  response.hits.map((hit) => ({
    document: Object.fromEntries(
      Object.entries(hit).filter(([key]) => !HIT_METADATA_KEYS.includes(key)),
    ),
    highlights: Object.fromEntries(
      requested.map((field) => [
        field,
        getHighlightFragmentsFromHit(hit, field, markers, truncated),
      ]),
    ),
    native: hit,
  }));
