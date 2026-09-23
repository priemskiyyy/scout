import type { MiniSearchResult } from "src/types/MiniSearchResult";
import type { MiniSearchSearchOptions } from "src/types/MiniSearchSearchOptions";

/**
 * The injected MiniSearch instance, typed structurally so this package imports
 * no SDK at runtime. `TWildcard` is `typeof MiniSearch.wildcard` when the
 * instance is searched with it. `src/minisearch.contracts.ts` pins this to the
 * real types.
 *
 * @example
 * ```ts
 * const index: MiniSearchIndex = new MiniSearch({ fields: ["title"], storeFields: ["title"] });
 * ```
 * @see [minisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#minisearch)
 */
export type MiniSearchIndex<TWildcard extends symbol = never> = {
  search: (
    query: string | TWildcard,
    options?: MiniSearchSearchOptions,
  ) => readonly MiniSearchResult[];
};
