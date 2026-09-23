import type { HighlightFragment, HighlightMarkers } from "@priemskiyyy/scout";

import type { AlgoliaHit } from "src/types/AlgoliaHit";
import { getHighlightFragmentsFromResult } from "src/utils/getHighlightFragmentsFromResult";

/**
 * The fragments of every requested field on one hit. A field Algolia did not
 * highlight comes back empty.
 *
 * @example
 * ```ts
 * getHighlightsFromHit(hit, ["title"], markers); // { title: [...] }
 * ```
 */
export const getHighlightsFromHit = (
  hit: AlgoliaHit,
  requested: readonly string[],
  markers: HighlightMarkers,
): Readonly<Record<string, readonly HighlightFragment[]>> => {
  const result = hit._highlightResult;

  if (result === undefined) {
    return {};
  }

  return Object.fromEntries(
    requested.map((field) => [
      field,
      getHighlightFragmentsFromResult(result[field], [field], markers),
    ]),
  );
};
