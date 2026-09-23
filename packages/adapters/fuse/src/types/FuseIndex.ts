import type { FuseHit } from "src/types/FuseHit";

/**
 * The part of a Fuse instance the adapter uses. A real `Fuse` satisfies it,
 * so the adapter imports no SDK at runtime.
 *
 * @example
 * ```ts
 * const engine: FuseIndex<Product> = new Fuse(products, { keys: ["name"] });
 * ```
 * @see [fuse adapter](https://priemskiyyy.github.io/scout/adapters.html#fuse-js)
 */
export type FuseIndex<TDocument> = {
  readonly options: {
    readonly includeMatches: boolean;
    readonly useExtendedSearch: boolean;
    readonly useTokenSearch: boolean;
  };
  /** The keys Fuse indexed, whichever way the application configured them. */
  getIndex: () => { readonly keys: readonly { readonly id: string }[] };
  search: (
    query: string | { $or: Record<string, string>[] },
  ) => readonly FuseHit<TDocument>[];
};
