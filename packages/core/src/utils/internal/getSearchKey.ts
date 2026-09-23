import { canonicalize } from "src/utils/internal/canonicalize";
import type { IndexRuntime } from "src/utils/internal/IndexRuntime";
import { resolveSearch } from "src/utils/internal/resolveSearch";
import type { SearchState } from "src/utils/internal/SearchState";

/**
 * The canonical identity of one search: everything that decides its results,
 * resolved, together with the adapter's fingerprint. Two searches that mean
 * the same thing share it, and two that differ in any result-affecting way do
 * not.
 */
export const getSearchKey = (
  runtime: IndexRuntime,
  state: SearchState,
): readonly unknown[] => {
  const { request, filter } = resolveSearch(runtime, state);

  return [
    "scout",
    runtime.name,
    canonicalize(
      {
        fingerprint: runtime.adapter.fingerprint(),
        query: request.query,
        searchable: request.searchable,
        profile: request.profile,
        sort: request.sort,
        filter,
        facets: request.facets,
        highlights: request.highlights,
        page: request.page,
        provider: request.provider,
      },
      "search",
    ),
  ];
};
