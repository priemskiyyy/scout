import type { FilterComparison } from "src/types/FilterComparison";

/**
 * A filter tree. Consumers never build these nodes by hand: the field objects
 * and the `and`, `or` and `not` helpers on the search builder produce them.
 *
 * An adapter receives this tree already normalised: every group has at least
 * two members and no member of its own kind, set operands are deduplicated
 * and sorted, and nothing constant is left in it, because the core answers a
 * filter that matches nothing without calling the adapter, and sends `null`
 * for one that matches everything.
 *
 * @example
 * ```ts
 * const filter: FilterExpression = { type: "comparison", field: "price", operator: "lte", value: 200 };
 * ```
 *
 * @see [Filters](https://priemskiyyy.github.io/scout/filters.html)
 */
export type FilterExpression =
  | { readonly type: "and"; readonly expressions: readonly FilterExpression[] }
  | { readonly type: "or"; readonly expressions: readonly FilterExpression[] }
  | { readonly type: "not"; readonly expression: FilterExpression }
  | FilterComparison;
