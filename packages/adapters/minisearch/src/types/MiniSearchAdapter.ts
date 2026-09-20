import type { SearchAdapter } from "@priemskiyyy/scout";
import type { MiniSearchIndex } from "src/types/MiniSearchIndex";
import type { MiniSearchProfile } from "src/types/MiniSearchProfile";
import type { MiniSearchResult } from "src/types/MiniSearchResult";
import type { MiniSearchSort } from "src/types/MiniSearchSort";

/**
 * A MiniSearch adapter that retains its configured sort and profile names
 * for compile-time coverage checks.
 *
 * @example
 * ```ts
 * const adapter: MiniSearchAdapter<"default", "relevance"> = minisearch(options);
 * ```
 * @see [minisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#minisearch)
 */
export type MiniSearchAdapter<
  TProfile extends string = string,
  TSort extends string = string,
> = SearchAdapter<
  MiniSearchIndex,
  MiniSearchProfile,
  MiniSearchResult,
  readonly MiniSearchResult[] | null
> & {
  profiles: Readonly<Record<TProfile, MiniSearchProfile>>;
  sorts: Readonly<Record<TSort, MiniSearchSort>>;
};
