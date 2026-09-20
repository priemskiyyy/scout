import type { FilterExpression } from "src/types/FilterExpression";

type Equality<TValue> = {
  /** Exactly this value. Never a partial or analysed match. */
  eq: (value: TValue) => FilterExpression;
  neq: (value: TValue) => FilterExpression;
};

type Membership<TValue> = {
  /** An empty list matches nothing. */
  in: (values: readonly TValue[]) => FilterExpression;
  /** An empty list restricts nothing. */
  notIn: (values: readonly TValue[]) => FilterExpression;
};

type Ordering<TValue> = {
  gt: (value: TValue) => FilterExpression;
  gte: (value: TValue) => FilterExpression;
  lt: (value: TValue) => FilterExpression;
  lte: (value: TValue) => FilterExpression;
  /** Inclusive at both ends. */
  between: (min: TValue, max: TValue) => FilterExpression;
};

/**
 * The operators a field offers, chosen from the type the schema gives it. A
 * boolean field has no range operators and a string field has no `between`,
 * because neither has portable semantics across these engines.
 *
 * An array field offers its element operators, so `tags.eq("sale")` asks
 * whether the array contains that value, which is how every launch engine
 * reads an equality filter on a repeated field.
 *
 * @example
 * ```ts
 * const belowBudget = (price: FilterField<number>) => price.lte(200);
 * ```
 *
 * @see [FilterFields usage](https://priemskiyyy.github.io/scout/filters.html)
 */
export type FilterField<TValue> = [TValue] extends [boolean]
  ? Equality<boolean>
  : [TValue] extends [readonly (infer TElement)[]]
    ? FilterField<TElement>
    : [TValue] extends [number]
      ? Equality<number> & Membership<number> & Ordering<number>
      : [TValue] extends [string]
        ? Equality<string> & Membership<string>
        : never;
