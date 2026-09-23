import type { HighlightFragment } from "@priemskiyyy/scout";

/**
 * One hit a backend answers. `highlights` holds Scout's own fragments, keyed
 * by field. Anything else on a hit, such as a score, reaches the application
 * on `hit.native`, because Scout has no normalised score.
 *
 * @example
 * ```ts
 * const hit: ScoutWireHit = { document: { id: "1" }, score: 1.6 };
 * ```
 * @see [http adapter](https://priemskiyyy.github.io/scout/adapters.html#http-your-own-endpoint)
 */
export type ScoutWireHit = {
  document: unknown;
  highlights?: Readonly<Record<string, readonly HighlightFragment[]>>;
  [key: string]: unknown;
};
