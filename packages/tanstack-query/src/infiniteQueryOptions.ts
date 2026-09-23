import type { IndexShape, SearchBuilder, SearchPage } from "@priemskiyyy/scout";
import type { QueryFunctionContext, QueryKey } from "@tanstack/query-core";

// The core says "unknown" only for a page that came back full, which is the
// one sign there may be more, so the list asks for the next page. When the
// real last page happens to be exactly full, that costs one empty request.
const getNextPage = (page: SearchPage): number | undefined => {
  if (typeof page.next === "number") {
    return page.next;
  }

  if (page.next === "unknown") {
    return page.current + 1;
  }

  return undefined;
};

/**
 * Builds infinite-query options and forwards TanStack's cancellation signal.
 * The key fixes the page at one and adds an `"infinite"` namespace so all pages
 * share an entry without colliding with a regular query. Caching policy stays
 * with the application.
 *
 * @example
 * ```ts
 * const query = useInfiniteQuery(infiniteQueryOptions(products.search(text)));
 * const hits = flattenHits(query.data);
 * ```
 */
export const infiniteQueryOptions = <
  TShape extends IndexShape,
  TFacet extends TShape["facetable"],
  THighlight extends TShape["highlightable"],
>(
  search: SearchBuilder<TShape, TFacet, THighlight>,
) => {
  type Page = Awaited<ReturnType<typeof search.execute>>;

  // The marker goes after the namespace rather than at the end, so the prefix
  // that reaches every Scout query still reaches this one.
  const [namespace, ...rest] = search.page({ current: 1 }).key();
  const queryKey: QueryKey = [namespace, "infinite", ...rest];

  return {
    queryKey,
    queryFn: ({
      pageParam,
      signal,
    }: Pick<QueryFunctionContext<QueryKey, number>, "pageParam" | "signal">) =>
      search.page({ current: pageParam }).execute({ signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: Page) => getNextPage(lastPage.page),
    getPreviousPageParam: (firstPage: Page) => firstPage.page.previous,
  };
};
