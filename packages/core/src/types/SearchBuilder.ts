import type { FacetValues } from "src/types/FacetValues";
import type { FilterExpression } from "src/types/FilterExpression";
import type { FilterFields } from "src/types/FilterFields";
import type { FilterHelpers } from "src/types/FilterHelpers";
import type { IndexShape } from "src/types/IndexShape";
import type { SearchResult } from "src/types/SearchResult";

/**
 * Builds an immutable search. Chainable methods return a new builder;
 * only `execute()` dispatches a request.
 *
 * @example
 * ```ts
 * const search = products
 *   .search("wireless headphones")
 *   .where((p, { and, or }) =>
 *     and(p.inStock.eq(true), or(p.brand.eq("Sony"), p.brand.eq("Bose"))),
 *   )
 *   .sort("priceAsc")
 *   .facets("brand")
 *   .page({ size: 20 });
 *
 * const result = await search.execute();
 * ```
 */
export type SearchBuilder<
  TShape extends IndexShape,
  TFacet extends TShape["facetable"] = never,
  THighlight extends TShape["highlightable"] = never,
> = {
  /** Replaces the query text. */
  query: (text: string) => SearchBuilder<TShape, TFacet, THighlight>;
  /** Selects a named search profile the index declared. */
  profile: (
    name: TShape["profile"],
  ) => SearchBuilder<TShape, TFacet, THighlight>;
  /** Adds a filter. Repeated calls combine with AND. */
  where: (
    build: (
      fields: FilterFields<TShape>,
      helpers: FilterHelpers,
    ) => FilterExpression,
  ) => SearchBuilder<TShape, TFacet, THighlight>;
  /** Selects a named sort the index declared. */
  sort: (name: TShape["sort"]) => SearchBuilder<TShape, TFacet, THighlight>;
  /** Requests facets. The requested fields appear on the result type. */
  facets: <const TNames extends readonly TShape["facetable"][]>(
    ...names: TNames
  ) => SearchBuilder<TShape, TFacet | TNames[number], THighlight>;
  /** Requests highlights. The requested fields appear on every hit. */
  highlight: <const TNames extends readonly TShape["highlightable"][]>(
    ...names: TNames
  ) => SearchBuilder<TShape, TFacet, THighlight | TNames[number]>;
  /**
   * Moves to a page, resizes it, or both, and keeps what is left out. Pages
   * are one-based; adapters translate provider numbering.
   */
  page: (page: {
    current?: number;
    size?: number;
  }) => SearchBuilder<TShape, TFacet, THighlight>;
  /**
   * Adapter typed provider options. These take part in the query identity, so
   * two searches differing only here do not share a cache entry. They cannot
   * override a Scout owned field.
   */
  provider: (
    options: TShape["native"]["options"],
  ) => SearchBuilder<TShape, TFacet, THighlight>;
  /** The canonical identity of this search, for a cache key or a log. */
  key: () => readonly unknown[];
  execute: (context?: {
    signal?: AbortSignal;
  }) => Promise<
    SearchResult<
      TShape["document"],
      FacetValues<TShape, TFacet>,
      THighlight,
      TShape["native"]["hit"],
      TShape["native"]["response"]
    >
  >;
};
