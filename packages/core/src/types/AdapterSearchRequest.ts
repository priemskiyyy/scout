import type { FilterExpression } from "src/types/FilterExpression";

/**
 * Everything an adapter needs to build one provider request. Pages are
 * one-based here, so an adapter over a zero-based engine subtracts one.
 *
 * `filter` is already normalised, so an adapter never has to collapse an empty
 * group or an empty `in` for itself.
 *
 * @example
 * ```ts
 * const request: AdapterSearchRequest = {
 *   index: "products", query: "shoe", profile: "default", sort: "relevance",
 *   filter: { type: "constant", value: true }, facets: [], highlights: [],
 *   page: { current: 1, size: 20 }, provider: null,
 * };
 * ```
 *
 * @see [createSearchAdapter usage](https://priemskiyyy.github.io/scout/writing-an-adapter.html)
 */
export type AdapterSearchRequest<TNativeOptions = never> = {
  readonly index: string;
  readonly query: string;
  readonly profile: string;
  readonly sort: string;
  readonly filter: FilterExpression;
  readonly facets: readonly string[];
  readonly highlights: readonly string[];
  readonly page: { readonly current: number; readonly size: number };
  readonly provider: TNativeOptions | null;
};
