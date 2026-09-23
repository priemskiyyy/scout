import type { AdapterSearchRequest } from "@priemskiyyy/scout";

import type { OramaSearchParams } from "src/types/OramaSearchParams";
import type { OramaSearchProfile } from "src/types/OramaSearchProfile";
import { getFacetDefinitionsFromFields } from "src/utils/getFacetDefinitionsFromFields";
import { getSortByFromSort } from "src/utils/getSortByFromSort";
import { getWhereFromFilter } from "src/utils/getWhereFromFilter";

/**
 * Orama's search parameters for one resolved search: the profile's tuning,
 * then the page, the facets, the term, the filter and the sort.
 *
 * @example
 * ```ts
 * const params = getSearchParameters(request, profiles?.[request.profile], db.schema);
 * ```
 */
export const getSearchParameters = (
  request: AdapterSearchRequest,
  profile: OramaSearchProfile | undefined,
  schema: Readonly<Record<string, unknown>>,
): OramaSearchParams => {
  const params: OramaSearchParams = {
    ...profile,
    limit: request.page.size,
    offset: (request.page.current - 1) * request.page.size,
    facets: getFacetDefinitionsFromFields(schema, request.facets),
  };

  // With an empty term and properties, Orama still matches a token, so a
  // document with none in them would go missing. With neither, it answers
  // every document the filter allows.
  if (request.query !== "") {
    params.term = request.query;
    params.properties = request.searchable;
  }

  if (request.filter !== null) {
    params.where = getWhereFromFilter(schema, request.filter);
  }

  if (request.sort !== null) {
    params.sortBy = getSortByFromSort(schema, request.sort);
  }

  return params;
};
