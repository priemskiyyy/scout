import type { FilterValue } from "@priemskiyyy/scout";

import type { ElasticBoolQuery } from "src/types/ElasticBoolQuery";
import type { ElasticRange } from "src/types/ElasticRange";

/**
 * The part of the query language Scout writes: every document, the query text
 * over a profile's fields, exact terms, number ranges, and `bool` groups.
 *
 * @example
 * ```ts
 * const acme: ElasticQuery = { term: { "brand.keyword": { value: "Acme" } } };
 * ```
 */
export type ElasticQuery =
  | { match_all: Record<string, never> }
  | { multi_match: { query: string; fields: string[] } }
  | { term: Record<string, { value: FilterValue }> }
  | { terms: Record<string, FilterValue[]> }
  | { range: Record<string, ElasticRange> }
  | { bool: ElasticBoolQuery };
