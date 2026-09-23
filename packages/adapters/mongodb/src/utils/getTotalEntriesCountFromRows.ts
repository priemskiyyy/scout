import type { SearchTotal } from "@priemskiyyy/scout";

import type { MongoSearchRow } from "src/types/MongoSearchRow";
import { LOWER_BOUND_THRESHOLD } from "src/utils/constants/limits";

/**
 * How many documents matched, read from the count every row carries. Paging
 * reaches every match, so the scope is `matches`.
 *
 * @example
 * ```ts
 * getTotalEntriesCountFromRows(rows, { current: 1 });
 * // { value: 3, accuracy: "exact", scope: "matches" }
 * ```
 */
export const getTotalEntriesCountFromRows = (
  rows: readonly MongoSearchRow[],
  page: { readonly current: number },
): SearchTotal => {
  const row = rows[0];

  // The count arrives on the rows, so a page without rows has none. The first
  // page is empty only when nothing matched, but a later one can be past the
  // last match.
  if (row === undefined) {
    if (page.current === 1) {
      return { value: 0, accuracy: "exact", scope: "matches" };
    }

    return { accuracy: "unknown", scope: "matches" };
  }

  const { count } = row.__scout.meta;

  if (count?.total !== undefined) {
    return { value: count.total, accuracy: "exact", scope: "matches" };
  }

  if (count?.lowerBound === undefined) {
    return { accuracy: "unknown", scope: "matches" };
  }

  if (count.lowerBound > LOWER_BOUND_THRESHOLD) {
    return {
      value: count.lowerBound,
      accuracy: "lower-bound",
      scope: "matches",
    };
  }

  return { value: count.lowerBound, accuracy: "exact", scope: "matches" };
};
