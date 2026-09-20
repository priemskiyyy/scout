import type { FilterExpression } from "src/types/FilterExpression";

/**
 * The combinators handed to a `where` callback as its second argument.
 * Composing filters is ordinary TypeScript, so a conditional filter is an
 * ordinary `if` and there is no `whereIf`.
 *
 * @example
 * ```ts
 * products.search("shoe").where((fields, { or }) =>
 *   or(fields.brand.eq("Acme"), fields.brand.eq("North")));
 * ```
 *
 * @see [SearchBuilder usage](https://priemskiyyy.github.io/scout/filters.html)
 */
export type FilterHelpers = {
  and: (...expressions: readonly FilterExpression[]) => FilterExpression;
  or: (...expressions: readonly FilterExpression[]) => FilterExpression;
  not: (expression: FilterExpression) => FilterExpression;
};
