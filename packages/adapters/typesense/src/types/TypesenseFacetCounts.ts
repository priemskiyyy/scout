import type { TypesenseFacetCount } from "src/types/TypesenseFacetCount";

/**
 * What Typesense reports about one faceted field.
 *
 * `field_name` is `PropertyKey` rather than `string` because the SDK types it
 * as `keyof TDocument`, which on a client that was never given a document type
 * is not narrowed to a string. The wire value is always a string, so the
 * adapter reads it as one.
 *
 * @example
 * ```ts
 * const facet: TypesenseFacetCounts = { field_name: "brand", sampled: false,
 *   counts: [{ value: "Acme", count: 12 }] };
 * ```
 * @see [typesense adapter](https://priemskiyyy.github.io/scout/adapters.html#typesense)
 */
export type TypesenseFacetCounts = {
  readonly field_name: PropertyKey;
  /** `true` when Typesense counted a sample rather than every match. */
  readonly sampled: boolean;
  readonly counts: readonly TypesenseFacetCount[];
};
