/**
 * One value of a terms aggregation. A boolean's key is 1 or 0, and its
 * `key_as_string` is `"true"` or `"false"`.
 *
 * The OpenSearch client types a bucket as any of its aggregations' buckets,
 * some of which are bare records, so every field is optional here and the
 * rest are admitted.
 *
 * @example
 * ```ts
 * const bucket: ElasticTermsBucket = { key: "Acme", doc_count: 12 };
 * ```
 */
export type ElasticTermsBucket = {
  readonly [field: string]: unknown;
  readonly key?: unknown;
  readonly key_as_string?: string | undefined;
  readonly doc_count?: number | undefined;
};
