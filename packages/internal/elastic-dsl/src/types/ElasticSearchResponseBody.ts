import type { ElasticHit } from "src/types/ElasticHit";
import type { ElasticTermsAggregate } from "src/types/ElasticTermsAggregate";
import type { ElasticTotalHits } from "src/types/ElasticTotalHits";

/**
 * The part of a search answer this module reads, kept whole on
 * `result.native`.
 *
 * @example
 * ```ts
 * const body: ElasticSearchResponseBody = {
 *   took: 3, timed_out: false, _shards: { failed: 0 },
 *   hits: { total: { value: 0, relation: "eq" }, hits: [] },
 * };
 * ```
 */
export type ElasticSearchResponseBody = {
  readonly took: number;
  /** `true` when the search stopped at its `timeout` and answered with what it had. */
  readonly timed_out: boolean;
  /** How many shards failed, whose documents the answer leaves out. */
  readonly _shards: { readonly failed: number };
  readonly hits: {
    readonly total?: ElasticTotalHits | number | undefined;
    readonly hits: readonly ElasticHit[];
  };
  readonly aggregations?:
    Readonly<Record<string, ElasticTermsAggregate>> | undefined;
};
