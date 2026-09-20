import type { MiniSearchProfile } from "src/types/MiniSearchProfile";
import type { MiniSearchResult } from "src/types/MiniSearchResult";

/**
 * A profile plus the predicate this adapter builds from the filter AST.
 *
 * @example
 * ```ts
 * const options: MiniSearchSearchOptions = { prefix: true, filter: (hit) => hit.inStock === true };
 * ```
 * @see [minisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#minisearch)
 */
export type MiniSearchSearchOptions = MiniSearchProfile & {
  filter?: (result: MiniSearchResult) => boolean;
};
