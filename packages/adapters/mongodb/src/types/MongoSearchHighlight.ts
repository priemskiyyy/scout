/**
 * One passage of the `searchHighlights` meta: runs of text, each a hit or the
 * text around one.
 *
 * @example
 * ```ts
 * const highlight: MongoSearchHighlight = {
 *   path: "name", score: 1,
 *   texts: [{ value: "Trail ", type: "text" }, { value: "shoe", type: "hit" }],
 * };
 * ```
 * @see [mongodb adapter](https://priemskiyyy.github.io/scout/adapters.html#mongodb-search)
 */
export type MongoSearchHighlight = {
  readonly path: string;
  readonly texts: readonly {
    readonly value: string;
    readonly type: "hit" | "text";
  }[];
  readonly score: number;
};
