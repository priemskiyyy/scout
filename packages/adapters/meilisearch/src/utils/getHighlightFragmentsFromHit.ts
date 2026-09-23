import { splitHighlight } from "@priemskiyyy/scout/adapter";
import type { HighlightFragment, HighlightMarkers } from "@priemskiyyy/scout";

import type { MeilisearchSearchHit } from "src/types/MeilisearchSearchHit";

/**
 * The fragments of one highlighted field on a hit. Meilisearch formats a
 * scalar as a string and an array element by element. Anything else carries
 * no highlight to read, so the field reports none.
 *
 * @example
 * ```ts
 * getHighlightFragmentsFromHit(hit, "title", markers, false);
 * ```
 */
export const getHighlightFragmentsFromHit = (
  hit: MeilisearchSearchHit,
  field: string,
  markers: HighlightMarkers,
  truncated: boolean | "unknown",
): readonly HighlightFragment[] => {
  const formatted = hit._formatted;

  if (formatted === undefined || !Object.hasOwn(formatted, field)) {
    return [];
  }

  const value = formatted[field];

  if (typeof value === "string") {
    return [
      { path: [field], parts: splitHighlight(value, markers), truncated },
    ];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  const fragments: HighlightFragment[] = [];

  for (const [position, entry] of value.entries()) {
    if (typeof entry !== "string") {
      continue;
    }

    fragments.push({
      path: [field, position],
      parts: splitHighlight(entry, markers),
      truncated,
    });
  }

  return fragments;
};
