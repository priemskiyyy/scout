import type { SearchAdapter } from "src/types/SearchAdapter";
import type { StandardSchema } from "src/types/StandardSchema";

/**
 * Declares an index's portable contract. The adapter must cover every named
 * sort and profile.
 *
 * @example
 * ```ts
 * const products = index({ schema: ProductSchema, id: (product) => product.id,
 *   filterable: ["brand"], facetable: ["brand"], highlightable: ["name"],
 *   sorts: ["relevance"], profiles: ["default"], adapter });
 * ```
 *
 * @see [index usage](https://priemskiyyy.github.io/scout/indexes.html)
 */
export type IndexDefinition<
  TDocument,
  TFilterable extends readonly (keyof TDocument & string)[],
  TFacetable extends readonly (keyof TDocument & string)[],
  THighlightable extends readonly (keyof TDocument & string)[],
  TSortName extends string,
  TProfileName extends string,
  TNative,
  TOptions,
  TNativeHit,
  TNativeResponse,
> = {
  schema: StandardSchema<TDocument>;
  /** Stable identity for a document. Never a hit's position. */
  id: (document: TDocument) => string;
  filterable: TFilterable;
  facetable: TFacetable;
  highlightable: THighlightable;
  sorts: readonly [TSortName, ...TSortName[]];
  profiles: readonly [TProfileName, ...TProfileName[]];
  adapter: SearchAdapter<TNative, TOptions, TNativeHit, TNativeResponse> & {
    sorts: Readonly<Record<TSortName, unknown>>;
    profiles: Readonly<Record<TProfileName, unknown>>;
  };
  /**
   * What to do with a document that fails the schema. `"error"` fails the
   * search, `"skip"` drops it and reports how many were dropped, because that
   * changes what the page contains.
   *
   * There is no mode that skips validation and still claims a document type.
   * The validator is the only thing that turns a provider's response into the
   * declared type, so skipping it would make the type a claim nothing checks.
   */
  validate?: "error" | "skip";
  /**
   * Whether an empty query reaches the provider. Rejecting is the default,
   * because what an engine does with empty text differs and guessing a wildcard
   * would be a silent transformation.
   */
  emptyQuery?: "allow" | "reject";
};
