import { ScoutError } from "@priemskiyyy/scout";
import type { AdapterSort } from "@priemskiyyy/scout";

import { MAX_SORT_FIELDS } from "src/utils/constants/limits";

/**
 * The `sort_by` expression for one of the index's sorts, such as
 * `price:asc,name:desc`.
 *
 * @example
 * ```ts
 * getSortByFromSort({ name: "priceAsc", by: [{ field: "price", direction: "asc" }] });
 * // "price:asc"
 * ```
 */
export const getSortByFromSort = (sort: AdapterSort): string => {
  if (sort.by.length > MAX_SORT_FIELDS) {
    throw new ScoutError({
      code: "unsupported-feature",
      message: `Typesense sorts by at most ${MAX_SORT_FIELDS} fields, and ${sort.name} orders by ${sort.by.length}.`,
    });
  }

  return sort.by
    .map(({ field, direction }) => `${field}:${direction}`)
    .join(",");
};
