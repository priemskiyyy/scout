import type { HighlightFragment } from "src/types/HighlightFragment";

/**
 * One hit as the adapter produced it. The document is still unvalidated: the
 * core runs it through the index schema and derives its id, so an adapter never
 * has to know how the application identifies a document.
 *
 * @example
 * ```ts
 * const hit: AdapterSearchHit<{ score: number }> = {
 *   document: { id: "p1", name: "Shoe" }, highlights: {}, native: { score: 1 },
 * };
 * ```
 *
 * @see [AdapterSearchResponse usage](https://priemskiyyy.github.io/scout/writing-an-adapter.html)
 */
export type AdapterSearchHit<TNativeHit = unknown> = {
  readonly document: unknown;
  readonly highlights: Readonly<Record<string, readonly HighlightFragment[]>>;
  readonly native: TNativeHit;
};
