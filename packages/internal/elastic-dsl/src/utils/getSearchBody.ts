import type {
  AdapterSearchRequest,
  HighlightMarkers,
} from "@priemskiyyy/scout";

import type { ElasticBoolQuery } from "src/types/ElasticBoolQuery";
import type { ElasticSearchBody } from "src/types/ElasticSearchBody";
import type { ElasticSearchOptions } from "src/types/ElasticSearchOptions";
import type { ElasticSearchSettings } from "src/types/ElasticSearchSettings";
import { getExactFieldFromKeywords } from "src/utils/getExactFieldFromKeywords";
import { getQueryFromFilter } from "src/utils/getQueryFromFilter";

/**
 * The search body for one resolved search: the provider options, then
 * everything Scout writes, which the core has already made sure the provider
 * options do not carry.
 *
 * @example
 * ```ts
 * const body = getSearchBody(request, { keywords: { brand: "brand.keyword" } }, markers);
 * ```
 */
export const getSearchBody = (
  request: AdapterSearchRequest<ElasticSearchOptions>,
  settings: ElasticSearchSettings,
  markers: HighlightMarkers,
): ElasticSearchBody => {
  const keywords = settings.keywords ?? {};

  const bool: ElasticBoolQuery = {
    must: [
      {
        multi_match: {
          query: request.query,
          fields: [...request.searchable],
        },
      },
    ],
  };

  // A query with no text matches nothing, so a browse matches everything
  // the filter allows instead.
  if (request.query === "") {
    bool.must = [{ match_all: {} }];
  }

  // In `filter` rather than `post_filter`, so the aggregations count the
  // documents the hits come from.
  if (request.filter !== null) {
    bool.filter = [getQueryFromFilter(request.filter, keywords)];
  }

  const body: ElasticSearchBody = {
    ...request.provider,
    query: { bool },
    from: (request.page.current - 1) * request.page.size,
    size: request.page.size,
  };

  if (request.sort !== null) {
    body.sort = request.sort.by.map(({ field, direction }) => ({
      [getExactFieldFromKeywords(field, keywords)]: { order: direction },
    }));
  }

  if (request.facets.length > 0) {
    const aggs: Record<string, { terms: { field: string } }> = {};

    for (const field of request.facets) {
      aggs[field] = {
        terms: { field: getExactFieldFromKeywords(field, keywords) },
      };
    }

    body.aggs = aggs;
  }

  // Each value comes back whole, rather than cut into fragments.
  if (request.highlights.length > 0) {
    const fields: Record<string, { number_of_fragments: number }> = {};

    for (const field of request.highlights) {
      fields[field] = { number_of_fragments: 0 };
    }

    body.highlight = {
      pre_tags: [markers.open],
      post_tags: [markers.close],
      fields,
    };
  }

  // `false` would leave the count out altogether, so it is never sent.
  if (settings.trackTotalHits === true) {
    body.track_total_hits = true;
  }

  return body;
};
