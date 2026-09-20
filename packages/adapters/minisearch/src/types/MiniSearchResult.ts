/**
 * One MiniSearch result: the document id, the score, the matched terms, the
 * term to field match report, and whatever the instance was told to store.
 *
 * @example
 * ```ts
 * const result: MiniSearchResult = { id: "p1", score: 1, terms: ["shoe"],
 *   queryTerms: ["shoe"], match: { shoe: ["name"] }, name: "Running shoe" };
 * ```
 * @see [minisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#minisearch)
 */
export type MiniSearchResult = {
  id: unknown;
  score: number;
  terms: string[];
  queryTerms: string[];
  match: { [term: string]: string[] };
  [field: string]: unknown;
};
