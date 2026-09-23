import type { HighlightField } from "examples/shared/outpost/types/HighlightField";
import type { StoreHit } from "examples/shared/outpost/types/StoreHit";

/**
 * The fragments of a field the search asked to highlight, or `null` when it
 * did not. A page from before the highlights toggle lacks the field its type
 * promises.
 */
export const getRequestedHighlight = (hit: StoreHit, field: HighlightField) => {
  if (!Object.hasOwn(hit.highlights, field)) {
    return null;
  }

  return hit.highlights[field];
};
