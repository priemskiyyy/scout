import type { SearchAdapter } from "src/types/SearchAdapter";

/**
 * The supertype every concrete adapter satisfies, for code that holds an
 * adapter without knowing its native types.
 *
 * @example
 * ```ts
 * const adapters: readonly AnySearchAdapter[] = [productsAdapter, articlesAdapter];
 * ```
 *
 * @see {@linkcode SearchAdapter}
 */
export type AnySearchAdapter = SearchAdapter<
  unknown,
  unknown,
  unknown,
  unknown
>;
