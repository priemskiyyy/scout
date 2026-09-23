import type {
  AdapterSearchRequest,
  HighlightMarkers,
} from "@priemskiyyy/scout";

import type { AlgoliaSearchOptions } from "src/types/AlgoliaSearchOptions";
import type { AlgoliaSearchParams } from "src/types/AlgoliaSearchParams";
import { getFiltersFromFilter } from "src/utils/getFiltersFromFilter";

/**
 * The Algolia search parameters for one resolved search: the profile's
 * parameters, then the provider options, then everything Scout writes, which
 * the core and the factory have already made sure neither of the others sets.
 *
 * @example
 * ```ts
 * const searchParams = getSearchParameters(request, profiles?.[request.profile], markers);
 * ```
 */
export const getSearchParameters = (
  request: AdapterSearchRequest<AlgoliaSearchOptions>,
  profile: AlgoliaSearchOptions | undefined,
  markers: HighlightMarkers,
): AlgoliaSearchParams => {
  const params: AlgoliaSearchParams = {
    ...profile,
    ...request.provider,
    query: request.query,
    // Algolia pages are zero based.
    page: request.page.current - 1,
    hitsPerPage: request.page.size,
    restrictSearchableAttributes: [...request.searchable],
  };

  if (request.filter !== null) {
    params.filters = getFiltersFromFilter(request.filter);
  }

  if (request.facets.length > 0) {
    params.facets = [...request.facets];
  }

  // Algolia inserts the tags verbatim and escapes nothing, so its default
  // <em> would let a document forge a match.
  if (request.highlights.length > 0) {
    params.attributesToHighlight = [...request.highlights];
    params.highlightPreTag = markers.open;
    params.highlightPostTag = markers.close;
  }

  return params;
};
