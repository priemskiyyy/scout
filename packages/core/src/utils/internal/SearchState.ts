import type { FilterExpression } from "src/types/FilterExpression";

/** What a builder holds: the names and values a search asked for, before resolution. */
export type SearchState = {
  readonly query: string;
  readonly profile: string;
  readonly sort: string;
  /** Every `where` call, combined with and when the search is resolved. */
  readonly filters: readonly FilterExpression[];
  readonly facets: readonly string[];
  readonly highlights: readonly string[];
  readonly page: { readonly current: number; readonly size: number };
  readonly provider: unknown;
};
