import type { SearchAdapter } from "@priemskiyyy/scout";

import type { TypesenseHit } from "src/types/TypesenseHit";
import type { TypesenseSearchClient } from "src/types/TypesenseSearchClient";
import type { TypesenseSearchOptions } from "src/types/TypesenseSearchOptions";
import type { TypesenseSearchResponse } from "src/types/TypesenseSearchResponse";

/**
 * The adapter this package builds.
 *
 * @example
 * ```ts
 * const adapter: TypesenseSearchAdapter = typesense({ client, collection: "products" });
 * ```
 * @see [typesense adapter](https://priemskiyyy.github.io/scout/adapters.html#typesense)
 */
export type TypesenseSearchAdapter = SearchAdapter<
  TypesenseSearchClient,
  TypesenseSearchOptions,
  TypesenseHit,
  TypesenseSearchResponse
>;
