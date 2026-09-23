import type { SearchIndex } from "@priemskiyyy/scout";

import type { StoreShape } from "examples/shared/outpost/types/StoreShape";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { PAGE_SIZE } from "examples/shared/outpost/constants/store";
import { getFacetFields } from "examples/shared/outpost/utils/getFacetFields";
import { getHighlightFields } from "examples/shared/outpost/utils/getHighlightFields";
import { getStoreClauses } from "examples/shared/outpost/utils/getStoreClauses";

/**
 * The store's search on one engine, built from its controls. Facets and
 * highlights are always passed, possibly as nothing, so every engine's search
 * has the same type; the code the page shows leaves the empty ones out.
 *
 * @example
 * ```ts
 * const search = buildStoreSearch(runtime.indexes.orama, state);
 * ```
 */
export const buildStoreSearch = (
  index: SearchIndex<StoreShape>,
  state: StoreState,
) => {
  const clauses = getStoreClauses(state);

  let search = index
    .search(state.query)
    .facets(...getFacetFields(state))
    .highlight(...getHighlightFields(state))
    .page({ size: PAGE_SIZE });

  if (state.profile !== "default") {
    search = search.profile(state.profile);
  }

  const [only] = clauses;

  if (clauses.length === 1 && only !== undefined) {
    search = search.where((product) => only.build(product));
  }

  if (clauses.length > 1) {
    search = search.where((product, { and }) =>
      and(...clauses.map((clause) => clause.build(product))),
    );
  }

  if (state.sort !== "relevance") {
    search = search.sort(state.sort);
  }

  return search;
};
