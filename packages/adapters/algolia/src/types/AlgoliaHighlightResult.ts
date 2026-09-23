import type { AlgoliaHighlightResultOption } from "src/types/AlgoliaHighlightResultOption";

/**
 * What `_highlightResult` holds for one attribute: a value, an array for an
 * array attribute, or an object for a nested one, as `algoliasearch` types it.
 *
 * @example
 * ```ts
 * const tags: AlgoliaHighlightResult = [
 *   { value: "[open]shoe[close]", matchLevel: "full", matchedWords: ["shoe"] },
 * ];
 * ```
 * @see [algolia adapter](https://priemskiyyy.github.io/scout/adapters.html#algolia)
 */
export type AlgoliaHighlightResult =
  | AlgoliaHighlightResultOption
  // Mutable, as in the SDK, because `Array.isArray` does not narrow a
  // readonly array out of a union.
  | AlgoliaHighlightResult[]
  | { readonly [key: string]: AlgoliaHighlightResult };
