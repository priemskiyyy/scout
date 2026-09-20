import type { IndexShape } from "src/types/IndexShape";

/**
 * The value type each requested facet reports, taken from the schema field.
 * An engine that returns every facet value as a string, as Typesense does, is
 * the adapter's problem to coerce, not the consumer's to guess.
 *
 * @example
 * ```ts
 * type ProductFacets = FacetValues<ProductShape, "brand" | "price">;
 * ```
 *
 * @see [SearchResult usage](https://priemskiyyy.github.io/scout/facets.html)
 */
export type FacetValues<
  TShape extends IndexShape,
  TRequested extends TShape["facetable"],
> = {
  // A facetable field is always a document key, because the index declaration
  // constrains it. The fallback is `unknown` rather than `never` so an index
  // whose document type is not yet resolved still produces a usable result
  // type instead of an uninhabited one.
  [TField in TRequested]: TField extends keyof TShape["document"]
    ? TShape["document"][TField] extends readonly (infer TElement)[]
      ? TElement
      : TShape["document"][TField]
    : unknown;
};
