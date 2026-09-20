import type { MiniSearchIndex } from "src/types/MiniSearchIndex";
import type { MiniSearchProfile } from "src/types/MiniSearchProfile";
import type { MiniSearchSort } from "src/types/MiniSearchSort";

/**
 * Connects a borrowed MiniSearch index and its corpus revision to Scout.
 *
 * @example
 * ```ts
 * const options: MiniSearchOptions<"default", "relevance"> = {
 *   index: engine, revision: () => corpusVersion,
 *   profiles: { default: { prefix: true } }, sorts: { relevance: "relevance" },
 * };
 * ```
 * @see [minisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#minisearch)
 */
export type MiniSearchOptions<
  TProfile extends string = string,
  TSort extends string = string,
> = {
  /** The instance the application built and keeps up to date. */
  index: MiniSearchIndex;
  /**
   * Changes whenever the corpus changes. It joins the fingerprint, so a rebuilt
   * index produces a different query identity instead of serving a cached
   * answer from the corpus it replaced.
   */
  revision: () => string | number;
  /**
   * Builds the application document from a result's stored fields.
   *
   * Required unless the instance stores every schema field, because a
   * MiniSearch result carries only `storeFields` and Scout validates the whole
   * document. It runs before validation, so what it returns is what the schema
   * sees.
   */
  resolve?: (id: unknown, stored: Readonly<Record<string, unknown>>) => unknown;
  /** Named query shapes, one per profile the index declares. */
  profiles: Readonly<Record<TProfile, MiniSearchProfile>>;
  /** Named orders, every one of them an alias for relevance. */
  sorts: Readonly<Record<TSort, MiniSearchSort>>;
};
