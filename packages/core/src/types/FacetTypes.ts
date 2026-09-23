import type { FacetValueTypeOf } from "src/types/FacetValueTypeOf";

/**
 * The facetable fields of an index and the value type each one reports. Some
 * engines return every facet value as a string, so the index says once what a
 * value really is, and the core decodes it for every engine.
 *
 * @example
 * ```ts
 * const facetable: FacetTypes<Product> = { brand: "string", price: "number" };
 * ```
 *
 * @see [Facets](https://priemskiyyy.github.io/scout/facets.html)
 */
export type FacetTypes<TDocument> = {
  readonly [TField in keyof TDocument & string]?: FacetValueTypeOf<
    TDocument[TField]
  >;
};
