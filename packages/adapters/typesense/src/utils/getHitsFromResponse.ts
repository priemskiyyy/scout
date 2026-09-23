import type { AdapterSearchHit, HighlightMarkers } from "@priemskiyyy/scout";

import type { TypesenseHit } from "src/types/TypesenseHit";
import type { TypesenseSearchResponse } from "src/types/TypesenseSearchResponse";
import { getHighlightsFromHit } from "src/utils/getHighlightsFromHit";

/**
 * Every hit of one response, with its document, its requested highlights and
 * the whole Typesense hit, `text_match` among it, kept as `native`.
 *
 * @example
 * ```ts
 * getHitsFromResponse(response, request.highlights, markers);
 * ```
 */
export const getHitsFromResponse = (
  response: TypesenseSearchResponse,
  requested: readonly string[],
  markers: HighlightMarkers,
): readonly AdapterSearchHit<TypesenseHit>[] =>
  (response.hits ?? []).map((hit) => ({
    document: hit.document,
    highlights: getHighlightsFromHit(hit, requested, markers),
    native: hit,
  }));
