import { splitHighlight } from "@priemskiyyy/scout/adapter";
import type { HighlightFragment, HighlightMarkers } from "@priemskiyyy/scout";

import type { AlgoliaHighlightResult } from "src/types/AlgoliaHighlightResult";
import type { AlgoliaHighlightResultOption } from "src/types/AlgoliaHighlightResultOption";

// A nested attribute can be named `value`, so neither `in` nor the index
// signature tells an object apart from a value. A string `value` does: the
// nested attribute is itself a result, never a string.
const isHighlightOption = (
  node: Exclude<AlgoliaHighlightResult, AlgoliaHighlightResult[]>,
): node is AlgoliaHighlightResultOption => typeof node.value === "string";

/**
 * The fragments of one `_highlightResult` node. Algolia shapes an attribute
 * as a value, a nested object or an array, so the walk records where in the
 * document each value sits.
 *
 * @example
 * ```ts
 * getHighlightFragmentsFromResult(hit._highlightResult?.title, ["title"], markers);
 * ```
 */
export const getHighlightFragmentsFromResult = (
  node: AlgoliaHighlightResult | undefined,
  path: readonly (string | number)[],
  markers: HighlightMarkers,
): readonly HighlightFragment[] => {
  if (node === undefined) {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap((element, position) =>
      getHighlightFragmentsFromResult(element, [...path, position], markers),
    );
  }

  // `_highlightResult` carries the whole value. Truncating is what
  // `_snippetResult` does, and the adapter never asks for it.
  if (isHighlightOption(node)) {
    return [
      { path, parts: splitHighlight(node.value, markers), truncated: false },
    ];
  }

  return Object.entries(node).flatMap(([key, child]) =>
    getHighlightFragmentsFromResult(child, [...path, key], markers),
  );
};
