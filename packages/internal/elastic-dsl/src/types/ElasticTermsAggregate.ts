import type { ElasticTermsBucket } from "src/types/ElasticTermsBucket";

/**
 * The answer to one terms aggregation, and what it says about the values it
 * left out.
 *
 * Both clients type an answer's aggregations as any of their dozens of kinds,
 * so this reads the fields a terms aggregation has and admits the rest.
 * Buckets come as a list, or keyed by value when an aggregation asks for
 * `keyed: true`.
 *
 * @example
 * ```ts
 * const brand: ElasticTermsAggregate = {
 *   buckets: [{ key: "Acme", doc_count: 12 }],
 *   sum_other_doc_count: 0, doc_count_error_upper_bound: 0,
 * };
 * ```
 */
export type ElasticTermsAggregate = {
  readonly [field: string]: unknown;
  readonly buckets?:
    | readonly ElasticTermsBucket[]
    | Readonly<Record<string, ElasticTermsBucket>>
    | undefined;
  readonly sum_other_doc_count?: number | undefined;
  readonly doc_count_error_upper_bound?: number | undefined;
};
