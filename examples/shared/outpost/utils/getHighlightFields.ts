import type { HighlightField } from "examples/shared/outpost/types/HighlightField";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { HIGHLIGHT_FIELDS } from "examples/shared/outpost/constants/store";

/** The fields the store highlights: both, or none when highlights are off. */
export const getHighlightFields = (
  state: StoreState,
): readonly HighlightField[] => {
  if (!state.highlights) {
    return [];
  }

  return HIGHLIGHT_FIELDS;
};
