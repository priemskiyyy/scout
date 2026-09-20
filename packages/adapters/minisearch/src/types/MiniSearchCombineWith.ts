type Combination = "and" | "or" | "and_not";

/**
 * How MiniSearch combines query terms. The accepted casing follows its SDK.
 *
 * @example
 * ```ts
 * const combineWith: MiniSearchCombineWith = "and";
 * ```
 * @see [minisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#minisearch)
 */
export type MiniSearchCombineWith =
  Combination | Uppercase<Combination> | Capitalize<Combination>;
