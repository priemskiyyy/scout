import type { SearchAdapter } from "@priemskiyyy/scout";

import type { MiniSearchIndex } from "src/types/MiniSearchIndex";
import type { MiniSearchProfile } from "src/types/MiniSearchProfile";
import type { MiniSearchResult } from "src/types/MiniSearchResult";

/**
 * The adapter this package builds. Its provider options are per search
 * tuning, merged over the profile's.
 *
 * @example
 * ```ts
 * const adapter: MiniSearchAdapter = minisearch({ index, revision: () => 1 });
 * ```
 * @see [minisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#minisearch)
 */
export type MiniSearchAdapter = SearchAdapter<
  MiniSearchIndex,
  MiniSearchProfile,
  MiniSearchResult,
  readonly MiniSearchResult[]
>;
