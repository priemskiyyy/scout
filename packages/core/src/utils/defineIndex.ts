import type { IndexDeclaration } from "src/types/IndexDeclaration";
import type { IndexDefinition } from "src/types/IndexDefinition";
import { createFilterFields } from "src/utils/internal/createFilterFields";
import { createSearchBuilder } from "src/utils/internal/createSearchBuilder";
import type { IndexRuntime } from "src/utils/internal/IndexRuntime";

/**
 * Declares the schema, searchable fields, sorts and profiles for one index.
 * The adapter must cover every declared sort and profile.
 * Configuration references and defaults are captured in a frozen declaration.
 *
 * @example
 * ```ts
 * const products = index({
 *   schema: ProductSchema,
 *   id: (product) => product.id,
 *   filterable: ["brand", "price", "inStock"],
 *   facetable: ["brand"],
 *   highlightable: ["name"],
 *   sorts: ["relevance", "priceAsc"],
 *   profiles: ["default"],
 *   adapter: typesense({ client, collection: "products", sorts, profiles }),
 * });
 * ```
 */
export const index = <
  TDocument,
  const TFilterable extends readonly (keyof TDocument & string)[],
  const TFacetable extends readonly (keyof TDocument & string)[],
  const THighlightable extends readonly (keyof TDocument & string)[],
  const TSortName extends string,
  const TProfileName extends string,
  TNative,
  TOptions,
  TNativeHit,
  TNativeResponse,
>({
  schema,
  id: identify,
  filterable,
  sorts: [sort],
  profiles: [profile],
  adapter,
  validate = "error",
  emptyQuery = "reject",
}: IndexDefinition<
  TDocument,
  TFilterable,
  TFacetable,
  THighlightable,
  TSortName,
  TProfileName,
  TNative,
  TOptions,
  TNativeHit,
  TNativeResponse
>) => {
  type Shape = {
    document: TDocument;
    native: {
      client: TNative;
      options: TOptions;
      hit: TNativeHit;
      response: TNativeResponse;
    };
    filterable: TFilterable[number];
    facetable: TFacetable[number];
    highlightable: THighlightable[number];
    sort: TSortName;
    profile: TProfileName;
  };

  const fields = createFilterFields<Shape>(filterable);

  const declaration: IndexDeclaration<Shape> = {
    adapter,
    create: (name, isDisposed) => {
      const runtime: IndexRuntime<TOptions, TDocument> = {
        adapter,
        schema,
        identify,
        validate,
        emptyQuery,
        isDisposed,
      };
      return {
        name,
        native: adapter.native,
        search: (text) =>
          createSearchBuilder<Shape>(runtime, fields, {
            index: name,
            query: text,
            profile,
            sort,
            filter: { type: "and", expressions: [] },
            facets: [],
            highlights: [],
            page: Object.freeze({ current: 1, size: 20 }),
            provider: null,
          }),
      };
    },
  };
  Object.freeze(declaration);
  return declaration;
};
