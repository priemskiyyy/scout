import type { SearchPage } from "src/types/SearchPage";
import type { SearchTotal } from "src/types/SearchTotal";

const getNextPage = (
  page: { readonly current: number; readonly size: number },
  total: SearchTotal,
  received: number,
  retrievable: number | undefined,
): SearchPage["next"] => {
  // A page the engine could not fill is the last one it has.
  if (received < page.size) {
    return null;
  }

  // Past where the engine stops paging, there is nothing more to fetch,
  // however many matches it counted.
  if (retrievable !== undefined && page.current * page.size >= retrievable) {
    return null;
  }

  if (total.accuracy === "unknown") {
    return "unknown";
  }

  // An estimate can run high or low, so it neither promises another page nor
  // rules one out, however far this page got.
  if (total.accuracy === "estimated") {
    return "unknown";
  }

  // At least this many documents match, so a page short of them has a next.
  if (page.current * page.size < total.value) {
    return page.current + 1;
  }

  // An exact count, or a bound on what pagination can reach, is used up. A
  // bound on the matches may be short, so another page cannot be ruled out.
  if (total.accuracy === "exact" || total.scope === "retrievable") {
    return null;
  }

  return "unknown";
};

const getPreviousPage = (current: number) => {
  if (current > 1) {
    return current - 1;
  }

  return null;
};

/**
 * Page metadata from what the request asked for, the engine's total and how
 * many hits came back, so no adapter computes it and no two disagree.
 */
export const getSearchPage = (
  page: { readonly current: number; readonly size: number },
  total: SearchTotal,
  received: number,
  retrievable?: number,
): SearchPage =>
  Object.freeze({
    current: page.current,
    size: page.size,
    next: getNextPage(page, total, received, retrievable),
    previous: getPreviousPage(page.current),
  });
