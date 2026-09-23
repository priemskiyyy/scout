import type { MiniSearchProfile } from "src/types/MiniSearchProfile";
import type { MiniSearchResult } from "src/types/MiniSearchResult";

/**
 * What the adapter passes to MiniSearch's `search`: the tuning, the fields
 * the profile searches and the predicate built from the filter.
 *
 * @example
 * ```ts
 * const options: MiniSearchSearchOptions = { fields: ["title"], prefix: true };
 * ```
 * @see [minisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#minisearch)
 */
export type MiniSearchSearchOptions = MiniSearchProfile & {
  fields?: string[];
  filter?: (result: MiniSearchResult) => boolean;
};
