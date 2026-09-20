import type { FacetValueType } from "@priemskiyyy/scout";

/**
 * How to read a facet label Typesense encodes as a string.
 * @example
 * ```ts
 * const type: TypesenseFacetType = "number";
 * ```
 * @see [typesense adapter](https://priemskiyyy.github.io/scout/adapters.html#typesense)
 */
export type TypesenseFacetType = FacetValueType;
