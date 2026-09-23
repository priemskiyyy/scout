import type {
  AdapterSearchHit,
  AdapterSearchRequest,
} from "@priemskiyyy/scout";

import type { MiniSearchResult } from "src/types/MiniSearchResult";

/**
 * The hits of one page, a one based slice of every match, each keeping the
 * raw MiniSearch result, `score` and `match` among it, as `native`.
 *
 * @example
 * ```ts
 * getPageHitsFromMatches(matches, { current: 2, size: 10 });
 * ```
 */
export const getPageHitsFromMatches = (
  matches: readonly {
    readonly result: MiniSearchResult;
    readonly document: unknown;
  }[],
  page: AdapterSearchRequest["page"],
): readonly AdapterSearchHit<MiniSearchResult>[] => {
  const start = (page.current - 1) * page.size;

  return matches
    .slice(start, start + page.size)
    .map(({ result, document }) => ({
      document,
      highlights: {},
      native: result,
    }));
};
