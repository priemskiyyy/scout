/**
 * The buckets an engine returned for one facet. Values arrive as the engine
 * encoded them: the core decodes each one to the type the index declared.
 *
 * `exhaustive` is what the engine said about its own counting, such as
 * Algolia's `exhaustive.facetValues` or Typesense's `sampled`, and `"unknown"`
 * when it said nothing.
 *
 * @example
 * ```ts
 * const brand: AdapterFacet = { values: [{ value: "Acme", count: 12 }], exhaustive: true, native: null };
 * ```
 *
 * @see [Writing an adapter](https://priemskiyyy.github.io/scout/writing-an-adapter.html)
 */
export type AdapterFacet = {
  readonly values: readonly {
    readonly value: unknown;
    readonly count: number;
  }[];
  readonly exhaustive: boolean | "unknown";
  readonly native: unknown;
};
