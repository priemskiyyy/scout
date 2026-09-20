import type { FuseHit } from "src/types/FuseHit";

/**
 * The injected Fuse instance used by `fuse`. No SDK import is needed at runtime.
 *
 * @example
 * ```ts
 * const engine: FuseIndex<Product> = new Fuse(products, { keys: ["name"] });
 * ```
 * @see [fuse adapter](https://priemskiyyy.github.io/scout/adapters.html#fuse-js)
 */
export type FuseIndex<TDocument> = {
  readonly options: { readonly includeMatches: boolean };
  search: (query: string) => readonly FuseHit<TDocument>[];
};
