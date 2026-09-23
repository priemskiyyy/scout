import type { SearchFacet } from "@priemskiyyy/scout";

import type { FacetClaim } from "examples/shared/outpost/types/FacetClaim";

export const getFacetClaim = (facet: SearchFacet<unknown>): FacetClaim => {
  if (facet.exhaustive === true) {
    return "exhaustive";
  }

  if (facet.exhaustive === false) {
    return "sampled";
  }

  return "unsaid";
};
