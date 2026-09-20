import type { TypesenseHit } from "src/types/TypesenseHit";
import type { TypesenseFacetCounts } from "src/types/TypesenseFacetCounts";

/**
 * One Typesense search response, kept whole on `result.native`.
 *
 * @example
 * ```ts
 * const response: TypesenseSearchResponse = { found: 0, page: 1, hits: [] };
 * ```
 * @see [typesense adapter](https://priemskiyyy.github.io/scout/adapters.html#typesense)
 */
export type TypesenseSearchResponse = {
  readonly found: number;
  readonly page: number;
  readonly search_time_ms?: number;
  /** `true` when Typesense stopped early, so `found` is a guess. */
  readonly search_cutoff?: boolean;
  readonly hits?: readonly TypesenseHit[];
  readonly grouped_hits?: readonly unknown[];
  readonly facet_counts?: readonly TypesenseFacetCounts[];
};
