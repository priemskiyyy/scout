import type { AdapterSort } from "@priemskiyyy/scout";

import type { FuseHit } from "src/types/FuseHit";
import { getFieldValue } from "src/utils/getFieldValue";
import { getOrderOfValues } from "src/utils/getOrderOfValues";

/**
 * Fuse's matches in the order a sort asks for, or in Fuse's own order for
 * relevance. A document without the field comes last in either direction,
 * and a tie keeps Fuse's own order, because the sort is stable.
 *
 * @example
 * ```ts
 * getSortedHits(matches, { name: "priceAsc", by: [{ field: "price", direction: "asc" }] });
 * ```
 */
export const getSortedHits = <THit extends FuseHit<unknown>>(
  hits: readonly THit[],
  sort: AdapterSort | null,
): readonly THit[] => {
  if (sort === null) {
    return hits;
  }

  return [...hits].sort((earlier, later) => {
    for (const { field, direction } of sort.by) {
      const left = getFieldValue(earlier.item, field);
      const right = getFieldValue(later.item, field);
      const isLeftMissing = left === undefined || left === null;
      const isRightMissing = right === undefined || right === null;

      if (isLeftMissing && isRightMissing) {
        continue;
      }

      if (isLeftMissing) {
        return 1;
      }

      if (isRightMissing) {
        return -1;
      }

      const order = getOrderOfValues(left, right);

      if (order === 0) {
        continue;
      }

      if (direction === "asc") {
        return order;
      }

      return -order;
    }

    return 0;
  });
};
