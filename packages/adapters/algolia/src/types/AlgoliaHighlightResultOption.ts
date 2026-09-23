/**
 * One highlighted attribute value in `_highlightResult`. `value` is the whole
 * attribute with the search's own markers around each match.
 *
 * @example
 * ```ts
 * const option: AlgoliaHighlightResultOption = {
 *   value: "Acme [open]shoe[close]", matchLevel: "full", matchedWords: ["shoe"],
 * };
 * ```
 * @see [algolia adapter](https://priemskiyyy.github.io/scout/adapters.html#algolia)
 */
export type AlgoliaHighlightResultOption = {
  readonly value: string;
  readonly matchLevel: "none" | "partial" | "full";
  readonly matchedWords: readonly string[];
  readonly fullyHighlighted?: boolean | undefined;
};
