import type { TypesenseSearchClient } from "src/types/TypesenseSearchClient";
import type { TypesenseProfile } from "src/types/TypesenseProfile";
import type { TypesenseSort } from "src/types/TypesenseSort";
import type { TypesenseFacetType } from "src/types/TypesenseFacetType";

/**
 * Configures the collection, named profiles and sorts on a borrowed Typesense client.
 *
 * @example
 * ```ts
 * const options: TypesenseAdapterOptions<"relevance", "default"> = {
 *   client, collection: "products", profiles: { default: { queryBy: ["name"] } },
 *   sorts: { relevance: {} }, facets: { price: "number" },
 * };
 * ```
 * @see [typesense adapter](https://priemskiyyy.github.io/scout/adapters.html#typesense)
 */
export type TypesenseAdapterOptions<
  TSortName extends string,
  TProfileName extends string,
> = {
  /** The client the application owns. The adapter never closes it. */
  client: TypesenseSearchClient;
  collection: string;
  profiles: Readonly<Record<TProfileName, TypesenseProfile>>;
  sorts: Readonly<Record<TSortName, TypesenseSort>>;
  /**
   * The declared type of each facetable field. Typesense reports every facet
   * value as a string, so a field left out arrives as the string it came as.
   */
  facets?: Readonly<Record<string, TypesenseFacetType>>;
};
