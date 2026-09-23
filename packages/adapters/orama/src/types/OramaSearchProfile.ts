/**
 * How Orama tunes one of the index's profiles. The properties a profile
 * searches come from the index.
 *
 * @example
 * ```ts
 * const forgiving: OramaSearchProfile = { tolerance: 2 };
 * ```
 * @see [orama adapter](https://priemskiyyy.github.io/scout/adapters.html#orama)
 */
export type OramaSearchProfile = {
  boost?: Readonly<Record<string, number>>;
  tolerance?: number;
  threshold?: number;
};
