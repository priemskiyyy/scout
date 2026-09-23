import type { AdapterSort } from "@priemskiyyy/scout";

import { assertUnreachable } from "src/utils/assertUnreachable";

/**
 * The `$search` sort for one of the index's sorts, fields in priority order.
 *
 * @example
 * ```ts
 * getSortFromSort({ name: "priceAsc", by: [{ field: "price", direction: "asc" }] });
 * // { price: 1 }
 * ```
 */
export const getSortFromSort = (
  sort: AdapterSort,
): Readonly<Record<string, 1 | -1>> => {
  const order: Record<string, 1 | -1> = {};

  for (const { field, direction } of sort.by) {
    if (direction === "asc") {
      order[field] = 1;
      continue;
    }

    if (direction === "desc") {
      order[field] = -1;
      continue;
    }

    assertUnreachable(direction);
  }

  return order;
};
