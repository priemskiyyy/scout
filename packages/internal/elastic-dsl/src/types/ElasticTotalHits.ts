/**
 * How many documents matched. `"gte"` means the engine stopped counting.
 *
 * @example
 * ```ts
 * const total: ElasticTotalHits = { value: 10000, relation: "gte" };
 * ```
 */
export type ElasticTotalHits = {
  readonly value: number;
  readonly relation: "eq" | "gte";
};
