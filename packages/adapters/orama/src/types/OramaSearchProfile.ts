/**
 * One named search profile: which properties Orama reads and how forgiving the
 * match is. Everything here changes which documents match or in what order,
 * which is what a profile name stands for.
 *
 * @example
 * ```ts
 * const profile: OramaSearchProfile = { properties: ["name"], tolerance: 1 };
 * ```
 * @see [orama adapter](https://priemskiyyy.github.io/scout/adapters.html#orama)
 */
export type OramaSearchProfile = {
  properties?: readonly string[];
  boost?: Readonly<Record<string, number>>;
  tolerance?: number;
  threshold?: number;
};
