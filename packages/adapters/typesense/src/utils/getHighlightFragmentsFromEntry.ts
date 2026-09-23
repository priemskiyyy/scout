import { splitHighlight } from "@priemskiyyy/scout/adapter";
import type { HighlightFragment, HighlightMarkers } from "@priemskiyyy/scout";

import type { TypesenseHighlight } from "src/types/TypesenseHighlight";

/**
 * The fragments of one highlighted field. Typesense reports a match by
 * wrapping it rather than by offset, so the markers this search asked for are
 * what splits it back into parts.
 *
 * @example
 * ```ts
 * getHighlightFragmentsFromEntry("name", { field: "name", value: marked }, markers);
 * ```
 */
export const getHighlightFragmentsFromEntry = (
  field: string,
  entry: TypesenseHighlight,
  markers: HighlightMarkers,
): readonly HighlightFragment[] => {
  // An array field is reported as parallel snippets and indices, so the
  // element that matched is part of the path.
  if (Array.isArray(entry.snippets)) {
    return entry.snippets.map((snippet, position) => {
      const index = entry.indices?.[position];
      const parts = splitHighlight(snippet, markers);

      if (typeof index === "number") {
        return { path: [field, index], parts, truncated: "unknown" };
      }

      return { path: [field], parts, truncated: "unknown" };
    });
  }

  // `value` is the whole field with markers, so nothing was cut from it.
  if (typeof entry.value === "string") {
    return [
      {
        path: [field],
        parts: splitHighlight(entry.value, markers),
        truncated: false,
      },
    ];
  }

  // `snippet` is a window around the match, and Typesense never says how much
  // of the field it left out.
  if (typeof entry.snippet === "string") {
    return [
      {
        path: [field],
        parts: splitHighlight(entry.snippet, markers),
        truncated: "unknown",
      },
    ];
  }

  return [];
};
