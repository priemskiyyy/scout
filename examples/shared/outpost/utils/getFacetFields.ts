import type { FacetField } from "examples/shared/outpost/types/FacetField";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { FACET_FIELDS } from "examples/shared/outpost/constants/store";

/** The facets the store asks for: every one, or none when counts are off. */
export const getFacetFields = (state: StoreState): readonly FacetField[] => {
  if (!state.facets) {
    return [];
  }

  return FACET_FIELDS;
};
