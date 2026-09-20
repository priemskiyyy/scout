import type { TypesenseSearchParameters } from "src/types/TypesenseSearchParameters";
import type { TypesenseSearchResponse } from "src/types/TypesenseSearchResponse";

/**
 * The part of a Typesense client the adapter uses. A real `Client` or
 * `SearchClient` satisfies it, and so does any object with the same shape.
 *
 * @example
 * ```ts
 * const searchClient: TypesenseSearchClient = new SearchClient({ nodes, apiKey: searchOnlyKey });
 * ```
 * @see [typesense adapter](https://priemskiyyy.github.io/scout/adapters.html#typesense)
 */
export type TypesenseSearchClient = {
  collections: (collection: string) => {
    documents: () => {
      search(
        parameters: TypesenseSearchParameters,
        options: { abortSignal?: AbortSignal | null },
      ): Promise<TypesenseSearchResponse>;
    };
  };
};
