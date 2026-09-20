/**
 * The primitive type encoded by a provider's string facet labels.
 *
 * @example
 * ```ts
 * const facets: Readonly<Record<string, FacetValueType>> = { price: "number" };
 * ```
 */
export type FacetValueType = "string" | "number" | "boolean";
