import type {
  AdapterSearchRequest,
  HighlightMarkers,
} from "@priemskiyyy/scout";

import type { TypesenseProfile } from "src/types/TypesenseProfile";
import type { TypesenseSearchOptions } from "src/types/TypesenseSearchOptions";
import type { TypesenseSearchParameters } from "src/types/TypesenseSearchParameters";
import { getFilterByFromFilter } from "src/utils/getFilterByFromFilter";
import { getSortByFromSort } from "src/utils/getSortByFromSort";

/**
 * The Typesense search parameters for one resolved search: the provider
 * options, then everything Scout writes, which the core has already made sure
 * the provider options do not carry.
 *
 * @example
 * ```ts
 * const parameters = getSearchParameters(request, profiles?.[request.profile], markers);
 * ```
 */
export const getSearchParameters = (
  request: AdapterSearchRequest<TypesenseSearchOptions>,
  profile: TypesenseProfile | undefined,
  markers: HighlightMarkers,
): TypesenseSearchParameters => {
  const parameters: TypesenseSearchParameters = {
    ...request.provider,
    q: request.query,
    query_by: request.searchable.join(","),
    page: request.page.current,
    per_page: request.page.size,
  };

  // Typesense spells every document as `*`.
  if (request.query === "") {
    parameters.q = "*";
  }

  if (profile?.prefix !== undefined) {
    parameters.prefix = profile.prefix;
  }

  if (request.filter !== null) {
    parameters.filter_by = getFilterByFromFilter(request.filter);
  }

  if (request.sort !== null) {
    parameters.sort_by = getSortByFromSort(request.sort);
  }

  if (request.facets.length > 0) {
    parameters.facet_by = request.facets.join(",");
  }

  if (request.highlights.length > 0) {
    parameters.highlight_fields = request.highlights.join(",");
    parameters.highlight_start_tag = markers.open;
    parameters.highlight_end_tag = markers.close;
  }

  return parameters;
};
