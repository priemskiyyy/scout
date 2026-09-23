import type { FacetField } from "examples/shared/outpost/types/FacetField";
import type { StoreResult } from "examples/shared/outpost/types/StoreResult";

/**
 * A facet the search asked for, or `null` when it did not. The store asks for
 * facets only while counts are on, so a page from before a toggle can lack
 * the one its type promises.
 */
export const getRequestedFacet = <TField extends FacetField>(
  result: StoreResult,
  field: TField,
) => {
  if (!Object.hasOwn(result.facets, field)) {
    return null;
  }

  return result.facets[field];
};
