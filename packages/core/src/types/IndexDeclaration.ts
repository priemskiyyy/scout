import type { AdapterSort } from "src/types/AdapterSort";
import type { FacetValueType } from "src/types/FacetValueType";
import type { StandardSchema } from "src/types/StandardSchema";

/**
 * What `index()` produces: the portable contract, resolved and frozen. It
 * names no engine, so one declaration serves every `Scout` that binds an
 * adapter to it.
 *
 * `sorts` includes `"relevance"` as `null`, and `profiles` includes
 * `"default"` as the index's searchable fields, so every name a search can use
 * is a key here.
 *
 * @example
 * ```ts
 * const products: IndexDeclaration<Product> = index({ schema, id, searchable: ["name"] });
 * ```
 *
 * @see [Indexes](https://priemskiyyy.github.io/scout/indexes.html)
 */
export type IndexDeclaration<
  TDocument = unknown,
  TFilterable extends string = string,
  TFacetable extends string = string,
  THighlightable extends string = string,
  TSortName extends string = string,
  TProfileName extends string = string,
> = {
  readonly schema: StandardSchema<TDocument>;
  // A method, so a declaration over one document type is still an index.
  id(document: TDocument): string;
  readonly filterable: readonly TFilterable[];
  readonly facetable: Readonly<Record<TFacetable, FacetValueType>>;
  readonly highlightable: readonly THighlightable[];
  readonly sorts: Readonly<Record<TSortName, AdapterSort | null>>;
  readonly profiles: Readonly<Record<TProfileName, readonly string[]>>;
  readonly validate: "error" | "skip";
};
