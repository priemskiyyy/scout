import type { IndexShape, SearchBuilder } from "@priemskiyyy/scout";
import type { QueryFunctionContext } from "@tanstack/query-core";

/**
 * Builds options for TanStack Query and forwards its cancellation signal.
 * Caching, retries and refetch policy remain application choices.
 *
 * @example
 * ```ts
 * const { data } = useQuery({
 *   ...queryOptions(products.search(text).facets("brand")),
 *   staleTime: 30_000,
 * });
 * ```
 */
export const queryOptions = <
  TShape extends IndexShape,
  TFacet extends TShape["facetable"],
  THighlight extends TShape["highlightable"],
>(
  search: SearchBuilder<TShape, TFacet, THighlight>,
) => ({
  queryKey: search.key(),
  queryFn: ({ signal }: Pick<QueryFunctionContext, "signal">) =>
    search.execute({ signal }),
});
