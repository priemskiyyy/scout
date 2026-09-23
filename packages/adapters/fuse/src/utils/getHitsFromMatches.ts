import type {
  AdapterSearchHit,
  AdapterSearchRequest,
} from "@priemskiyyy/scout";

import type { FuseHit } from "src/types/FuseHit";
import { getHighlightsFromHit } from "src/utils/getHighlightsFromHit";

/**
 * The hits of one page, cut from every match in order, each with its
 * document, its requested highlights and the whole Fuse hit as `native`.
 *
 * @example
 * ```ts
 * getHitsFromMatches(matches, { current: 2, size: 10 }, ["title"]);
 * ```
 */
export const getHitsFromMatches = <TDocument>(
  matches: readonly FuseHit<TDocument>[],
  page: AdapterSearchRequest["page"],
  highlights: readonly string[],
): readonly AdapterSearchHit<FuseHit<TDocument>>[] => {
  const start = (page.current - 1) * page.size;

  return matches.slice(start, start + page.size).map((hit) => ({
    document: hit.item,
    highlights: getHighlightsFromHit(hit, highlights),
    native: hit,
  }));
};
