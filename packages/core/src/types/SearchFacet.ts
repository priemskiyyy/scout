import type { SearchFacetValue } from "src/types/SearchFacetValue";

/**
 * The buckets an engine returned for one field.
 *
 * `exhaustive` is what the engine said about its own counting: Algolia's
 * `exhaustive.facetValues` and Typesense's `facet_counts[].sampled`. It is
 * `"unknown"` when the engine said nothing. Selection state belongs to the
 * application, never to this.
 *
 * @example
 * ```ts
 * const brand: SearchFacet<string> = { field: "brand", exhaustive: true,
 *   values: [{ value: "Acme", count: 12 }], native: null };
 * ```
 *
 * @see [SearchResult usage](https://priemskiyyy.github.io/scout/facets.html)
 */
export type SearchFacet<TValue = string> = {
  readonly field: string;
  readonly values: readonly SearchFacetValue<TValue>[];
  readonly exhaustive: boolean | "unknown";
  readonly native: unknown;
};
