/**
 * The pair an engine wraps a match in, so an adapter can ask for markers it
 * chose and read them back out of the answer.
 *
 * Mint one per search with `createHighlightMarkers`. A fixed pair is something
 * a document can be written to contain, and a balanced pair sitting in a
 * document's own text parses as a match the engine never made.
 *
 * @example
 * ```ts
 * const markers: HighlightMarkers = createHighlightMarkers();
 * ```
 *
 * @see [createHighlightMarkers usage](https://priemskiyyy.github.io/scout/highlights.html)
 */
export type HighlightMarkers = {
  readonly open: string;
  readonly close: string;
};
