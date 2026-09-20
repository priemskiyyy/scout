import type { IndexShape, SearchBuilder, SearchPage } from "@priemskiyyy/scout";
import type { QueryFunctionContext, QueryKey } from "@tanstack/query-core";

/**
 * Decision D4, in one place. `next` is what the engine claimed, and `size` is
 * how many hits the page was allowed to hold.
 *
 * `"unknown"` is an engine that cannot say whether another page exists. A page
 * that came back full is the only evidence there may be more, so that is the
 * only case this advances on. The known cost is one wasted request whenever the
 * real last page happens to be exactly full; the alternative silently truncates
 * results, and inventing a page count would break the core's promise that
 * uncertainty is preserved rather than guessed.
 */
const nextPage = (page: SearchPage, hits: number): number | undefined => {
  if (typeof page.next === "number") {
    return page.next;
  }
  if (page.next === null) {
    return undefined;
  }
  if (hits === page.size) {
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
  const [namespace, ...rest] = search.page(1).key();
  const queryKey: QueryKey = [namespace, "infinite", ...rest];

  return {
    queryKey,
    queryFn: ({
      pageParam,
      signal,
    }: Pick<QueryFunctionContext<QueryKey, number>, "pageParam" | "signal">) =>
      search.page(pageParam).execute({ signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: Page) =>
      nextPage(lastPage.page, lastPage.hits.length + lastPage.skipped),
    getPreviousPageParam: (firstPage: Page) => firstPage.page.previous,
  };
};
