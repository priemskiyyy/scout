/**
 * Every operator the portable contract admits. Anything outside this list
 * belongs to a named profile or to provider native options, because its
 * semantics cannot be conformance tested across engines.
 *
 * @example
 * ```ts
 * const operator: FilterOperator = "between";
 * ```
 *
 * @see [FilterExpression usage](https://priemskiyyy.github.io/scout/filters.html)
 */
export type FilterOperator =
  "eq" | "neq" | "in" | "not-in" | "gt" | "gte" | "lt" | "lte" | "between";
