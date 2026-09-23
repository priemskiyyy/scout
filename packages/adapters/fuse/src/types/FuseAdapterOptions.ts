import type { FuseIndex } from "src/types/FuseIndex";

/**
 * The Fuse instance to search and what versions its corpus.
 *
 * @example
 * ```ts
 * const options: FuseAdapterOptions<Product> = { index: engine, revision: () => version };
 * ```
 * @see [fuse adapter](https://priemskiyyy.github.io/scout/adapters.html#fuse-js)
 */
export type FuseAdapterOptions<TDocument> = {
  /** The instance the application owns. Disposing Scout leaves it usable. */
  index: FuseIndex<TDocument>;
  /** Change this when the corpus or the engine configuration changes. */
  revision: () => string | number;
};
