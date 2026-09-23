import type {
  AdapterSearchRequest,
  HighlightMarkers,
} from "@priemskiyyy/scout";

import type { MeilisearchSearchOptions } from "src/types/MeilisearchSearchOptions";
import type { MeilisearchSearchParams } from "src/types/MeilisearchSearchParams";
import { getFilterFromFilter } from "src/utils/getFilterFromFilter";
import { getPaginationParameters } from "src/utils/getPaginationParameters";

/**
 * The Meilisearch search parameters for one resolved search: the profile's
 * tuning, then the provider options, then everything Scout writes, which the
 * core has already made sure the provider options do not carry.
 *
 * @example
 * ```ts
 * const params = getSearchParameters(request, profiles?.[request.profile], "page", markers);
 * ```
 */
export const getSearchParameters = (
  request: AdapterSearchRequest<MeilisearchSearchOptions>,
  profile: MeilisearchSearchOptions | undefined,
  pagination: "page" | "offset",
  markers: HighlightMarkers,
): MeilisearchSearchParams => {
  const params: MeilisearchSearchParams = {
    ...profile,
    ...request.provider,
    ...getPaginationParameters(request.page, pagination),
    attributesToSearchOn: [...request.searchable],
  };

  if (request.filter !== null) {
    params.filter = getFilterFromFilter(request.filter);
  }

  if (request.sort !== null) {
    params.sort = request.sort.by.map(
      ({ field, direction }) => `${field}:${direction}`,
    );
  }

  if (request.facets.length > 0) {
    params.facets = [...request.facets];
  }

  if (request.highlights.length > 0) {
    params.attributesToHighlight = [...request.highlights];
    params.highlightPreTag = markers.open;
    params.highlightPostTag = markers.close;
  }

  return params;
};
