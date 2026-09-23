import type { ElasticSearchResponseBody } from "src/types/ElasticSearchResponseBody";

/**
 * Whether the engine answered with only part of the index: it stopped at the
 * search's `timeout`, or a shard failed. Its counts are then a lower bound.
 *
 * @example
 * ```ts
 * isPartialResponse({ ...body, timed_out: true }); // true
 * ```
 */
export const isPartialResponse = (body: ElasticSearchResponseBody): boolean =>
  body.timed_out || body._shards.failed > 0;
