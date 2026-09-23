import { ScoutError } from "@priemskiyyy/scout";
import type { AdapterSort } from "@priemskiyyy/scout";

import { getDeclaredKind } from "src/utils/getDeclaredKind";

/**
 * Orama's `sortBy` for one of the index's sorts. Orama orders by one
 * property, and only by one it keeps a sort index for.
 *
 * @example
 * ```ts
 * getSortByFromSort(db.schema, { name: "priceAsc", by: [{ field: "price", direction: "asc" }] });
 * // { property: "price", order: "ASC" }
 * ```
 */
export const getSortByFromSort = (
  schema: Readonly<Record<string, unknown>>,
  sort: AdapterSort,
): { readonly property: string; readonly order: "ASC" | "DESC" } => {
  const [only, ...others] = sort.by;

  if (only === undefined || others.length > 0) {
    throw new ScoutError({
      code: "unsupported-feature",
      message: `Orama orders by one property, and ${sort.name} orders by ${sort.by.length}.`,
    });
  }

  const kind = getDeclaredKind(schema, only.field);

  // Orama keeps a sort index for these kinds only.
  if (kind !== "number" && kind !== "string" && kind !== "boolean") {
    throw new ScoutError({
      code: "unsupported-feature",
      message: `Orama sorts a number, string or boolean property, and ${only.field} is not one.`,
    });
  }

  if (only.direction === "asc") {
    return { property: only.field, order: "ASC" };
  }

  return { property: only.field, order: "DESC" };
};
