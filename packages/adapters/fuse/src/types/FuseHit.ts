import type { FuseMatch } from "src/types/FuseMatch";

/**
 * One native Fuse answer, retained by the adapter on `hit.native`.
 *
 * @example
 * ```ts
 * const hit: FuseHit<{ id: string }> = { item: { id: "p1" }, refIndex: 0 };
 * ```
 * @see [fuse adapter](https://priemskiyyy.github.io/scout/adapters.html#fuse-js)
 */
export type FuseHit<TDocument> = {
  readonly item: TDocument;
  readonly refIndex: number;
  readonly score?: number;
  readonly matches?: readonly FuseMatch[];
};
