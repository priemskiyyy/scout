import type { MiniSearchIndex } from "src/types/MiniSearchIndex";
import type { MiniSearchProfile } from "src/types/MiniSearchProfile";

/**
 * A MiniSearch instance the application owns, and what the adapter needs to
 * read it.
 *
 * @example
 * ```ts
 * const options: MiniSearchOptions<typeof MiniSearch.wildcard> = {
 *   index: catalogue, wildcard: MiniSearch.wildcard, revision: () => version,
 * };
 * ```
 * @see [minisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#minisearch)
 */
export type MiniSearchOptions<TWildcard extends symbol = never> = {
  /** The instance the application built and keeps up to date. */
  index: MiniSearchIndex<NoInfer<TWildcard>>;
  /**
   * `MiniSearch.wildcard`, from minisearch 7.2, so an empty query browses
   * every document. The adapter imports no SDK, so it cannot name it itself.
   */
  wildcard?: TWildcard;
  /**
   * Changes whenever the corpus changes. It joins the fingerprint, so a rebuilt
   * index produces a new query identity instead of serving a cached answer from
   * the corpus it replaced.
   */
  revision: () => string | number;
  /**
   * Builds the application document from a result's stored fields. Required
   * unless the instance stores every schema field, because a result carries
   * only `storeFields` and Scout validates the whole document.
   */
  resolve?: (id: unknown, stored: Readonly<Record<string, unknown>>) => unknown;
  /** Tuning for the index's profiles, keyed by profile name. */
  profiles?: Readonly<Record<string, MiniSearchProfile>>;
};
