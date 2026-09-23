import type { IndexShape } from "src/types/IndexShape";
import type { SearchBuilder } from "src/types/SearchBuilder";
import { executeSearch } from "src/utils/internal/executeSearch";
import { FILTER_HELPERS } from "src/utils/internal/filterHelpers";
import { getSearchKey } from "src/utils/internal/getSearchKey";
import type { IndexRuntime } from "src/utils/internal/IndexRuntime";
import { requirePositiveInteger } from "src/utils/internal/requirePositiveInteger";
import type { SearchState } from "src/utils/internal/SearchState";
import { snapshotFilter } from "src/utils/internal/snapshotFilter";
import { snapshotValue } from "src/utils/internal/snapshotValue";

// Equivalent field sets must share a query key.
const getFieldSet = (current: readonly string[], added: readonly string[]) =>
  Object.freeze([...new Set([...current, ...added])].sort());

const getBuilder = (
  runtime: IndexRuntime,
  state: SearchState,
): SearchBuilder<IndexShape, string, string> => {
  const next = (changes: Partial<SearchState>) =>
    getBuilder(runtime, Object.freeze({ ...state, ...changes }));

  return {
    query: (text) => next({ query: text }),
    profile: (name) => next({ profile: name }),
    where: (build) =>
      next({
        filters: Object.freeze([
          ...state.filters,
          snapshotFilter(build(runtime.fields, FILTER_HELPERS)),
        ]),
      }),
    sort: (name) => next({ sort: name }),
    facets: (...names) => next({ facets: getFieldSet(state.facets, names) }),
    highlight: (...names) =>
      next({ highlights: getFieldSet(state.highlights, names) }),
    page: (page) =>
      next({
        page: Object.freeze({
          current: requirePositiveInteger(
            "page.current",
            page.current ?? state.page.current,
          ),
          size: requirePositiveInteger(
            "page.size",
            page.size ?? state.page.size,
          ),
        }),
      }),
    provider: (options) => next({ provider: snapshotValue(options) }),
    key: () => getSearchKey(runtime, state),
    // Resolution failures reject like every other execute failure.
    execute: async (context) => executeSearch(runtime, state, context?.signal),
  };
};

/**
 * Every method returns a new builder over a frozen state. Nothing is resolved
 * or normalised until `key()` or `execute()` asks.
 */
// The overload preserves the index's types while the implementation works on
// the erased shape, which is what building methods from runtime state needs.
export function createSearchBuilder<
  TShape extends IndexShape,
  TFacet extends TShape["facetable"] = never,
  THighlight extends TShape["highlightable"] = never,
>(
  runtime: IndexRuntime,
  query: string,
): SearchBuilder<TShape, TFacet, THighlight>;

export function createSearchBuilder(
  runtime: IndexRuntime,
  query: string,
): SearchBuilder<IndexShape, string, string> {
  return getBuilder(
    runtime,
    Object.freeze({
      query,
      profile: "default",
      sort: "relevance",
      filters: Object.freeze([]),
      facets: Object.freeze([]),
      highlights: Object.freeze([]),
      page: Object.freeze({ current: 1, size: 20 }),
      provider: null,
    }),
  );
}
