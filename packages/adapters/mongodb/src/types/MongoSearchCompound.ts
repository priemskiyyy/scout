import type { MongoSearchOperator } from "src/types/MongoSearchOperator";

/**
 * The `compound` operator: `must` and `filter` clauses all match, `mustNot`
 * clauses none, and at least `minimumShouldMatch` of the `should` clauses.
 *
 * @example
 * ```ts
 * const compound: MongoSearchCompound = {
 *   must: [{ text: { query: "shoe", path: ["name"] } }],
 *   filter: [{ equals: { path: "inStock", value: true } }],
 * };
 * ```
 * @see [mongodb adapter](https://priemskiyyy.github.io/scout/adapters.html#mongodb-search)
 */
export type MongoSearchCompound = {
  must?: readonly MongoSearchOperator[];
  mustNot?: readonly MongoSearchOperator[];
  should?: readonly MongoSearchOperator[];
  filter?: readonly MongoSearchOperator[];
  minimumShouldMatch?: number;
};
