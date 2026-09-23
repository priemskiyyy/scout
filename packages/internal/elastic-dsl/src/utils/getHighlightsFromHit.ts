import { splitHighlight } from "@priemskiyyy/scout/adapter";
import type { HighlightFragment, HighlightMarkers } from "@priemskiyyy/scout";

import type { ElasticHit } from "src/types/ElasticHit";

// `number_of_fragments: 0` answers with each value that matched whole, one
// fragment per value, so only a string field's fragment is the whole field.
const getTruncated = (source: unknown, field: string): boolean | "unknown" => {
  if (typeof source !== "object" || source === null) {
    return "unknown";
  }

  if (
    typeof Object.getOwnPropertyDescriptor(source, field)?.value === "string"
  ) {
    return false;
  }

  return "unknown";
};

/**
 * The fragments of every requested field the engine highlighted on one hit,
 * split on the markers this search asked for. A field it left out is filled
 * in by the core.
 *
 * @example
 * ```ts
 * getHighlightsFromHit(hit, ["name"], markers); // { name: [...] }
 * ```
 */
export const getHighlightsFromHit = (
  hit: ElasticHit,
  requested: readonly string[],
  markers: HighlightMarkers,
): Readonly<Record<string, readonly HighlightFragment[]>> => {
  const highlights: Record<string, readonly HighlightFragment[]> = {};

  for (const [field, values] of Object.entries(hit.highlight ?? {})) {
    if (!requested.includes(field)) {
      continue;
    }

    const truncated = getTruncated(hit._source, field);

    highlights[field] = values.map((value) => ({
      path: [field],
      parts: splitHighlight(value, markers),
      truncated,
    }));
  }

  return highlights;
};
