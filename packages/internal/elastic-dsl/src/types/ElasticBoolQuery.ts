import type { ElasticQuery } from "src/types/ElasticQuery";

/**
 * A `bool` query, the one way the query language groups clauses.
 *
 * @example
 * ```ts
 * const inStock: ElasticBoolQuery = { filter: [{ term: { inStock: { value: true } } }] };
 * ```
 */
export type ElasticBoolQuery = {
  must?: ElasticQuery[];
  filter?: ElasticQuery[];
  should?: ElasticQuery[];
  must_not?: ElasticQuery[];
  minimum_should_match?: number;
};
