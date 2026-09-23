/**
 * One hit, kept whole on `hit.native`, including `_score` and `_id`.
 *
 * @example
 * ```ts
 * const hit: ElasticHit = { _id: "1", _source: { name: "Trail shoe" } };
 * ```
 */
export type ElasticHit = {
  readonly _id?: string | undefined;
  readonly _score?: number | null | undefined;
  readonly _source?: unknown;
  readonly highlight?: Readonly<Record<string, readonly string[]>> | undefined;
};
