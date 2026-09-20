/**
 * One Orama result, kept whole so `hit.native` still carries its score.
 *
 * @example
 * ```ts
 * const hit: OramaHit<{ name: string }> = { id: "p1", score: 1, document: { name: "Shoe" } };
 * ```
 * @see [orama adapter](https://priemskiyyy.github.io/scout/adapters.html#orama)
 */
export type OramaHit<TDocument> = {
  id: string;
  score: number;
  document: TDocument;
};
