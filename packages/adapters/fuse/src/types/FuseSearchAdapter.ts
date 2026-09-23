import type { SearchAdapter } from "@priemskiyyy/scout";

import type { FuseHit } from "src/types/FuseHit";
import type { FuseIndex } from "src/types/FuseIndex";

/**
 * The adapter this package builds. It takes no provider options: Fuse's only
 * one per search is a result limit, and pages are Scout's.
 *
 * @example
 * ```ts
 * const adapter: FuseSearchAdapter<Product> = fuse({ index: engine, revision: () => 1 });
 * ```
 * @see [fuse adapter](https://priemskiyyy.github.io/scout/adapters.html#fuse-js)
 */
export type FuseSearchAdapter<TDocument> = SearchAdapter<
  FuseIndex<TDocument>,
  never,
  FuseHit<TDocument>,
  readonly FuseHit<TDocument>[]
>;
