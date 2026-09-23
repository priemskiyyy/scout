import type { HighlightFragment, HighlightMarkers } from "@priemskiyyy/scout";

import type { TypesenseHit } from "src/types/TypesenseHit";
import { getHighlightFragmentsFromEntry } from "src/utils/getHighlightFragmentsFromEntry";

/**
 * The fragments of every requested field Typesense highlighted on one hit.
 * A field it left out is filled in by the core.
 *
 * @example
 * ```ts
 * getHighlightsFromHit(hit, ["name"], markers); // { name: [...] }
 * ```
 */
export const getHighlightsFromHit = (
  hit: TypesenseHit,
  requested: readonly string[],
  markers: HighlightMarkers,
): Readonly<Record<string, readonly HighlightFragment[]>> => {
  const highlights: Record<string, readonly HighlightFragment[]> = {};

  for (const entry of hit.highlights ?? []) {
    const field = String(entry.field);

    if (!requested.includes(field)) {
      continue;
    }

    highlights[field] = [
      ...(highlights[field] ?? []),
      ...getHighlightFragmentsFromEntry(field, entry, markers),
    ];
  }

  return highlights;
};
