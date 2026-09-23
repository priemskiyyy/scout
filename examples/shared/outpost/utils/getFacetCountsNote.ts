import type { FacetCountsNote } from "examples/shared/outpost/types/FacetCountsNote";
import type { StoreResult } from "examples/shared/outpost/types/StoreResult";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { FACET_FIELDS } from "examples/shared/outpost/constants/store";
import { getRequestedFacet } from "examples/shared/outpost/utils/getRequestedFacet";

/**
 * What the counts beside the filters can claim: every match counted, a
 * sample, nothing said, counts switched off, or no counts to show.
 *
 * @example
 * ```ts
 * getFacetCountsNote(state, latest); // "sampled"
 * ```
 */
export const getFacetCountsNote = (
  state: StoreState,
  latest: StoreResult | null,
): FacetCountsNote => {
  if (!state.facets) {
    return "off";
  }

  if (latest === null) {
    return "none";
  }

  const facets = FACET_FIELDS.map((field) => getRequestedFacet(latest, field));

  if (facets.some((facet) => facet === null)) {
    return "none";
  }

  if (facets.some((facet) => facet?.exhaustive === false)) {
    return "sampled";
  }

  if (facets.some((facet) => facet?.exhaustive === "unknown")) {
    return "unsaid";
  }

  return "counted";
};
