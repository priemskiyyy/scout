/**
 * How Orama reports its own timing, which it measures in nanoseconds.
 *
 * @example
 * ```ts
 * const elapsed: OramaElapsed = { raw: 1_000_000 }; // One millisecond.
 * ```
 * @see [orama adapter](https://priemskiyyy.github.io/scout/adapters.html#orama)
 */
export type OramaElapsed = {
  raw: number;
};
