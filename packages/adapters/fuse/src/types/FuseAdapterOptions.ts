import type { FuseIndex } from "src/types/FuseIndex";

/**
 * Configures `fuse` over an application-owned engine. Names alias the injected
 * instance's search configuration; the adapter never changes it per request.
 *
 * @example
 * ```ts
 * fuse({ index: engine, revision: () => version,
 *   profiles: { default: null }, sorts: { relevance: null } });
 * ```
 * @see [fuse adapter](https://priemskiyyy.github.io/scout/adapters.html#fuse-js)
 */
export type FuseAdapterOptions<
  TDocument,
  TSort extends string,
  TProfile extends string,
> = {
  /** The configured engine. Disposing Scout leaves it usable. */
  index: FuseIndex<TDocument>;
  /** Change this when the corpus or the engine configuration changes. */
  revision: () => string | number;
  /** Portable names for the engine's configured ordering. */
  sorts: Readonly<Record<TSort, null>>;
  /** Portable names for the engine's configured matching. */
  profiles: Readonly<Record<TProfile, null>>;
};
