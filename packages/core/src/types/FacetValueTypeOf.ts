/**
 * The facet value type a document field reports. An array field reports its
 * elements, and a field that may be absent reports what it holds when present.
 *
 * @example
 * ```ts
 * type PriceFacet = FacetValueTypeOf<number>; // "number"
 * ```
 */
export type FacetValueTypeOf<TValue> = [NonNullable<TValue>] extends [
  readonly (infer TElement)[],
]
  ? FacetValueTypeOf<TElement>
  : [NonNullable<TValue>] extends [boolean]
    ? "boolean"
    : [NonNullable<TValue>] extends [number]
      ? "number"
      : [NonNullable<TValue>] extends [string]
        ? "string"
        : never;
