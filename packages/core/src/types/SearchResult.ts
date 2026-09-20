import type { SearchFacet } from "src/types/SearchFacet";
import type { SearchHit } from "src/types/SearchHit";
import type { SearchPage } from "src/types/SearchPage";
import type { SearchTotal } from "src/types/SearchTotal";

/**
 * One page of results.
 *
 * `facets` is keyed by the fields the search asked for, so reading a facet that
 * was never requested is a compile error rather than an undefined at runtime.
 * `skipped` counts documents dropped by `validate: "skip"`, which matters
 * because dropping a hit changes what the page contains.
 *
 * @example
 * ```ts
 * const result: SearchResult<Product, { brand: string }> =
 *   await products.search("shoe").facets("brand").execute();
 * ```
 *
 * @see [SearchBuilder usage](https://priemskiyyy.github.io/scout/search-builder.html)
 */
export type SearchResult<
  TDocument,
  TFacets extends Readonly<Record<string, unknown>> = Record<never, never>,
  THighlighted extends string = never,
  TNativeHit = unknown,
  TNativeResponse = unknown,
> = {
  readonly hits: readonly SearchHit<TDocument, THighlighted, TNativeHit>[];
  readonly page: SearchPage;
  readonly total: SearchTotal;
  readonly facets: {
    readonly [TField in keyof TFacets]: SearchFacet<TFacets[TField]>;
  };
  readonly skipped: number;
  readonly took: {
    readonly milliseconds: number;
    readonly source: "provider" | "scout";
  };
  readonly native: TNativeResponse;
};
