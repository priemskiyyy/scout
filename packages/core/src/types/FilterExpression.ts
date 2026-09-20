import type { FilterOperator } from "src/types/FilterOperator";

/**
 * The normalised filter tree an adapter translates. Consumers never build these
 * nodes by hand; the field objects on the search builder produce them.
 *
 * `constant` carries the result of a filter that resolved without reaching the
 * provider, such as an empty `in([])`, so an adapter can answer without a
 * request or translate it to the engine's own always-false expression.
 *
 * @example
 * ```ts
 * const filter: FilterExpression = { type: "comparison", field: "price", operator: "lte", value: 200 };
 * ```
 *
 * @see [normalizeFilter usage](https://priemskiyyy.github.io/scout/filters.html)
 */
export type FilterExpression =
  | { readonly type: "and"; readonly expressions: readonly FilterExpression[] }
  | { readonly type: "or"; readonly expressions: readonly FilterExpression[] }
  | { readonly type: "not"; readonly expression: FilterExpression }
  | {
      readonly type: "comparison";
      readonly field: string;
      readonly operator: FilterOperator;
      readonly value: unknown;
    }
  | { readonly type: "constant"; readonly value: boolean };
