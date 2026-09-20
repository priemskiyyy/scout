import type { MiniSearchCombineWith } from "src/types/MiniSearchCombineWith";

/**
 * MiniSearch query options for a named profile. Filtering belongs to Scout's
 * portable AST; tokenization and term processing belong to the index.
 *
 * @example
 * ```ts
 * const forgiving: MiniSearchProfile = { fields: ["name"], prefix: true, fuzzy: 0.2 };
 * ```
 * @see [minisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#minisearch)
 */
export type MiniSearchProfile = {
  fields?: string[];
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
