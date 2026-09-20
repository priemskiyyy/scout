/**
 * One Fuse match, with inclusive UTF-16 character ranges and an optional array
 * position. Returned on `FuseHit.matches` and preserved on `hit.native`.
 *
 * @example
 * ```ts
 * const match: FuseMatch = { key: "name", value: "shoe", indices: [[0, 3]] };
 * ```
 * @see [fuse adapter](https://priemskiyyy.github.io/scout/adapters.html#fuse-js)
 */
export type FuseMatch = {
  readonly indices: readonly (readonly [number, number])[];
  readonly key?: string;
  readonly refIndex?: number;
  readonly value?: string;
};
