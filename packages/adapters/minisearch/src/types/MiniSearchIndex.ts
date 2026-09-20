import type { MiniSearchSearchOptions } from "src/types/MiniSearchSearchOptions";
import type { MiniSearchResult } from "src/types/MiniSearchResult";

/**
 * The injected MiniSearch instance, typed structurally so this package imports
 * no SDK at runtime. `src/minisearch.contracts.ts` pins it to the real types.
 *
 * @example
 * ```ts
 * const index: MiniSearchIndex = new MiniSearch({ fields: ["name"], storeFields: ["name"] });
 * ```
 * @see [minisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#minisearch)
 */
export type MiniSearchIndex = {
  search: (
    query: string,
    options?: MiniSearchSearchOptions,
  ) => readonly MiniSearchResult[];
};
