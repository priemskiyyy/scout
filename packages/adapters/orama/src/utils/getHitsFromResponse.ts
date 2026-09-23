import type { AdapterSearchHit } from "@priemskiyyy/scout";

import type { OramaHit } from "src/types/OramaHit";
import type { OramaResponse } from "src/types/OramaResponse";

/**
 * Every hit of one response, with its document and the whole Orama hit, its
 * score among it, kept as `native`. Orama reports no match offsets, so no hit
 * carries a highlight.
 *
 * @example
 * ```ts
 * getHitsFromResponse(response)[0]?.native.score;
 * ```
 */
export const getHitsFromResponse = <TDocument>(
  response: OramaResponse<TDocument>,
): readonly AdapterSearchHit<OramaHit<TDocument>>[] =>
  response.hits.map((hit) => ({
    document: hit.document,
    highlights: {},
    native: hit,
  }));
