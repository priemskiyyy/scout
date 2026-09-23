import type { MiniSearchCombineWith } from "src/types/MiniSearchCombineWith";

/**
 * How MiniSearch tunes one of the index's profiles, or one search through
 * `.provider()`. The fields a search reads come from the index, and the filter
 * from Scout.
 *
 * @example
 * ```ts
 * const forgiving: MiniSearchProfile = { prefix: true, fuzzy: 0.2 };
 * ```
 * @see [minisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#minisearch)
 */
export type MiniSearchProfile = {
  boost?: { [field: string]: number };
  weights?: { fuzzy: number; prefix: number };
  prefix?:
    boolean | ((term: string, index: number, terms: string[]) => boolean);
  fuzzy?:
    | boolean
    | number
    | ((term: string, index: number, terms: string[]) => boolean | number);
  maxFuzzy?: number;
  combineWith?: MiniSearchCombineWith;
  bm25?: { k: number; b: number; d: number };
};
