import type { FacetTypes } from "src/types/FacetTypes";
import type { ProfileDefinition } from "src/types/ProfileDefinition";
import type { SortDefinition } from "src/types/SortDefinition";
import type { StandardSchema } from "src/types/StandardSchema";
import type { TextFieldOf } from "src/types/TextFieldOf";

/**
 * Declares an index's portable contract, independent of the engine that
 * serves it. Every part but the schema, the id and the searchable fields is
 * optional.
 *
 * - `searchable` holds the fields the query text runs against by default.
 * - `facetable` maps each facetable field to its value type, checked against
 *   the schema, because some engines return every facet value as a string.
 * - `sorts` defines named sorts by their fields. `"relevance"`, the engine's
 *   own order, always exists and is the default.
 * - `profiles` defines named searches over other fields. `"default"` always
 *   exists and searches `searchable`.
 * - `validate` decides what a document that fails the schema does: `"error"`
 *   fails the search, `"skip"` drops it and counts it on the result.
 *
 * @example
 * ```ts
 * const products = index({ schema: ProductSchema, id: (product) => product.id,
 *   searchable: ["name"], filterable: ["brand", "price"], facetable: { brand: "string" },
 *   sorts: { priceAsc: { price: "asc" } } });
 * ```
 *
 * @see [Indexes](https://priemskiyyy.github.io/scout/indexes.html)
 */
export type IndexDefinition<
  TDocument,
  TSearchable extends TextFieldOf<TDocument>,
  TFilterable extends keyof TDocument & string,
  TFacets extends FacetTypes<TDocument>,
  THighlightable extends keyof TDocument & string,
  TSorts extends Readonly<Record<string, SortDefinition<TDocument>>>,
  TProfiles extends Readonly<
    Record<string, ProfileDefinition<TextFieldOf<TDocument>>>
  >,
> = {
  schema: StandardSchema<TDocument>;
  /** Stable identity for a document. Never a hit's position. */
  id: (document: TDocument) => string;
  searchable: readonly [TSearchable, ...TSearchable[]];
  filterable?: readonly TFilterable[];
  facetable?: TFacets & {
    readonly [TField in Exclude<keyof TFacets, keyof TDocument>]: never;
  };
  highlightable?: readonly THighlightable[];
  sorts?: TSorts & {
    readonly relevance?: never;
  } & {
    readonly [TName in keyof TSorts]: {
      readonly [TField in Exclude<keyof TSorts[TName], keyof TDocument>]: never;
    };
  };
  profiles?: TProfiles & { readonly default?: never };
  validate?: "error" | "skip";
};
