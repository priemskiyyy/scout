import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import type { FilterFields } from "src/types/FilterFields";
import type { IndexShape } from "src/types/IndexShape";
import type { SearchBuilder } from "src/types/SearchBuilder";
import type { IndexRuntime } from "src/utils/internal/IndexRuntime";
import { FILTER_HELPERS } from "src/utils/internal/filterHelpers";
import { executeSearch } from "src/utils/internal/executeSearch";
import { normalizeFilter } from "src/utils/internal/normalizeFilter";
import { requirePositiveInteger } from "src/utils/internal/requirePositiveInteger";
import { searchKey } from "src/utils/searchKey";
import { snapshotFilter } from "src/utils/internal/snapshotFilter";
import { snapshotValue } from "src/utils/internal/snapshotValue";

/**
 * Every method builds a new request. Filters are normalized only when the
 * request is keyed or executed, so chaining never repeats that work.
 */
export function createSearchBuilder<
  TShape extends IndexShape,
  TFacet extends TShape["facetable"] = never,
  THighlight extends TShape["highlightable"] = never,
>(
  runtime: IndexRuntime<TShape["native"]["options"], TShape["document"]>,
  fields: FilterFields<TShape>,
  request: AdapterSearchRequest<TShape["native"]["options"]>,
): SearchBuilder<TShape, TFacet, THighlight>;
// The overload preserves field and native types while the implementation uses
// the erased IndexShape to build methods from runtime keys.
export function createSearchBuilder(
  runtime: IndexRuntime<unknown, unknown>,
  fields: FilterFields<IndexShape>,
  request: AdapterSearchRequest<unknown>,
): SearchBuilder<IndexShape, string, string> {
  const next = (changes: Partial<AdapterSearchRequest<unknown>>) =>
    createSearchBuilder<IndexShape, string, string>(
      runtime,
      fields,
      Object.freeze({ ...request, ...changes }),
    );
  const normalized = () => ({
    ...request,
    filter: normalizeFilter(request.filter),
  });

  return {
    query: (text) => next({ query: text }),
    profile: (name) => next({ profile: name }),
    where: (build) =>
      next({
        filter: {
          type: "and",
          expressions: [
            ...(request.filter.type === "and"
              ? request.filter.expressions
              : [request.filter]),
            snapshotFilter(build(fields, FILTER_HELPERS)),
          ],
        },
      }),
    sort: (name) => next({ sort: name }),
    facets: (...names) =>
      // Equivalent field sets must share a query key.
      next({ facets: [...new Set([...request.facets, ...names])].sort() }),
    highlight: (...names) =>
      next({
        highlights: [...new Set([...request.highlights, ...names])].sort(),
      }),
    page: (number) =>
      next({
        page: Object.freeze({
          ...request.page,
          current: requirePositiveInteger("page", number),
        }),
      }),
    pageSize: (size) =>
      next({
        page: Object.freeze({
          ...request.page,
          size: requirePositiveInteger("pageSize", size),
        }),
      }),
    provider: (options) => next({ provider: snapshotValue(options) }),
    key: () => searchKey(normalized(), runtime.adapter.fingerprint()),
    // Normalization failures must reject like every other execute failure.
    execute: async (context) =>
      executeSearch(
        runtime,
        normalized(),
        context?.signal ?? new AbortController().signal,
      ),
  };
}
