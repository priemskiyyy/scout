import { ScoutError } from "@priemskiyyy/scout";
import type { AdapterSearchRequest } from "@priemskiyyy/scout";

import type { MongoSearchCompound } from "src/types/MongoSearchCompound";
import type { MongoSearchExtrasExpression } from "src/types/MongoSearchExtrasExpression";
import type { MongoSearchOperator } from "src/types/MongoSearchOperator";
import type { MongoSearchOptions } from "src/types/MongoSearchOptions";
import type { MongoSearchPipelineStage } from "src/types/MongoSearchPipelineStage";
import type { MongoSearchStage } from "src/types/MongoSearchStage";
import { getOperatorFromFilter } from "src/utils/getOperatorFromFilter";
import { getSortFromSort } from "src/utils/getSortFromSort";

/**
 * The aggregation pipeline for one resolved search: the `$search` stage, the
 * page, and the metadata every returned document carries under `__scout`.
 * The provider options come first, and the core has already made sure they
 * carry nothing Scout writes.
 *
 * @example
 * ```ts
 * const pipeline = getSearchPipeline(request, {
 *   index: "default",
 *   tokens: ["brand"],
 *   exactTotals: false,
 * });
 * ```
 */
export const getSearchPipeline = (
  request: AdapterSearchRequest<MongoSearchOptions>,
  {
    index,
    tokens,
    exactTotals,
  }: {
    readonly index: string;
    readonly tokens: readonly string[];
    readonly exactTotals: boolean;
  },
): MongoSearchPipelineStage[] => {
  // A string facet counts a token field. A number facet needs boundaries the
  // request does not carry, and there is no boolean facet at all.
  for (const path of request.facets) {
    if (!tokens.includes(path)) {
      throw new ScoutError({
        code: "unsupported-feature",
        message: `MongoDB Search facets only a string field indexed as token. Map ${path} as token and list it in tokens.`,
      });
    }
  }

  // There is no operator for every document, so a browse matches every
  // document holding a field the search reads, which a query implies anyway.
  const everything: MongoSearchOperator = {
    compound: {
      should: request.searchable.map((path) => ({ exists: { path } })),
      minimumShouldMatch: 1,
    },
  };

  const compound: MongoSearchCompound = {
    must: [{ text: { query: request.query, path: request.searchable } }],
  };

  if (request.query === "") {
    compound.must = [everything];
  }

  if (request.filter !== null) {
    compound.filter = [getOperatorFromFilter(request.filter, tokens)];
  }

  // Up to its threshold a lower bound is an exact count, and cheaper.
  const stage: MongoSearchStage = {
    ...request.provider,
    index,
    count: { type: "lowerBound" },
  };

  const extras: MongoSearchExtrasExpression = {
    meta: "$$SEARCH_META",
    score: { $meta: "searchScore" },
  };

  if (exactTotals) {
    stage.count = { type: "total" };
  }

  if (request.sort !== null) {
    stage.sort = getSortFromSort(request.sort);
  }

  if (request.highlights.length > 0) {
    stage.highlight = { path: request.highlights };
    extras.highlights = { $meta: "searchHighlights" };
  }

  const page: MongoSearchPipelineStage[] = [
    { $skip: (request.page.current - 1) * request.page.size },
    { $limit: request.page.size },
    { $set: { __scout: extras } },
  ];

  if (request.facets.length === 0) {
    return [{ $search: { ...stage, compound } }, ...page];
  }

  return [
    {
      $search: {
        ...stage,
        facet: {
          operator: { compound },
          facets: Object.fromEntries(
            request.facets.map((path) => [path, { type: "string", path }]),
          ),
        },
      },
    },
    ...page,
  ];
};
