import type { AdapterSort } from "src/types/AdapterSort";
import type { FilterExpression } from "src/types/FilterExpression";

/**
 * Everything an adapter needs to build one provider request, already resolved
 * against the index. Pages are one-based, so an adapter over a zero-based
 * engine subtracts one.
 *
 * - `query` is empty to browse: match everything the filter allows.
 * - `searchable` holds the fields the profile searches.
 * - `sort` is `null` for the engine's own relevance order.
 * - `filter` is normalised, and `null` when nothing is filtered out. A filter
 *   that can match nothing never reaches an adapter.
 *
 * @example
 * ```ts
 * const request: AdapterSearchRequest = {
 *   index: "products", query: "shoe", searchable: ["name"], profile: "default",
 *   sort: null, filter: null, facets: [], highlights: [],
 *   page: { current: 1, size: 20 }, provider: null,
 * };
 * ```
 *
 * @see [Writing an adapter](https://priemskiyyy.github.io/scout/writing-an-adapter.html)
 */
export type AdapterSearchRequest<TNativeOptions = never> = {
  readonly index: string;
  readonly query: string;
  readonly searchable: readonly string[];
  readonly profile: string;
  readonly sort: AdapterSort | null;
  readonly filter: FilterExpression | null;
  readonly facets: readonly string[];
  readonly highlights: readonly string[];
  readonly page: { readonly current: number; readonly size: number };
  readonly provider: TNativeOptions | null;
};
