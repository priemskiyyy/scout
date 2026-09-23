import type { HighlightFragment } from "@priemskiyyy/scout";

import type { MongoSearchRow } from "src/types/MongoSearchRow";

/**
 * The fragments of every requested field MongoDB Search highlighted on one
 * row. It returns passages already split into hits and the text around them,
 * without saying whether a passage is the whole value.
 *
 * @example
 * ```ts
 * getHighlightsFromRow(row, ["name"]); // { name: [...] }
 * ```
 */
export const getHighlightsFromRow = (
  row: MongoSearchRow,
  requested: readonly string[],
): Readonly<Record<string, readonly HighlightFragment[]>> => {
  const highlights: Record<string, readonly HighlightFragment[]> = {};

  for (const highlight of row.__scout.highlights ?? []) {
    if (!requested.includes(highlight.path)) {
      continue;
    }

    highlights[highlight.path] = [
      ...(highlights[highlight.path] ?? []),
      {
        path: [highlight.path],
        parts: highlight.texts.map(({ value, type }) => ({
          text: value,
          matched: type === "hit",
        })),
        truncated: "unknown",
      },
    ];
  }

  return highlights;
};
