import type { FilterValue } from "src/types/FilterValue";

type Comparison<TOperator, TValue> = {
  readonly type: "comparison";
  readonly field: string;
  readonly operator: TOperator;
  readonly value: TValue;
};

/**
 * One field compared with a value. Each operator carries the value it
 * compares with, so an adapter reads a number for a range and a list for a
 * set without checking either.
 *
 * @example
 * ```ts
 * const cheap: FilterComparison = { type: "comparison", field: "price", operator: "lte", value: 200 };
 * ```
 *
 * @see [Filters](https://priemskiyyy.github.io/scout/filters.html)
 */
export type FilterComparison =
  | Comparison<"eq" | "neq", FilterValue>
  | Comparison<"in" | "not-in", readonly FilterValue[]>
  | Comparison<"gt" | "gte" | "lt" | "lte", number>
  | Comparison<"between", readonly [number, number]>;
