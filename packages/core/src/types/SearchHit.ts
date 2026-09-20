import type { HighlightFragment } from "src/types/HighlightFragment";

/**
 * One result. `id` comes from the index's own `id()` function, so it is stable
 * across pages and refetches. Never use a hit's position as its identity: a
 * refetch that repopulates from the first page invalidates every offset.
 *
 * @example
 * ```ts
 * const hit: SearchHit<Product> = { id: product.id, document: product, highlights: {}, native: null };
 * ```
 *
 * @see [SearchResult usage](https://priemskiyyy.github.io/scout/search-builder.html)
 */
export type SearchHit<
  TDocument,
  THighlighted extends string = never,
  TNativeHit = unknown,
> = {
  readonly id: string;
  readonly document: TDocument;
  /**
   * Keyed by the fields the search asked to highlight. A requested field that
   * the engine did not highlight is present and empty, so rendering never has
   * to check for undefined.
   */
  readonly highlights: Readonly<
    Record<THighlighted, readonly HighlightFragment[]>
  >;
  readonly native: TNativeHit;
};
