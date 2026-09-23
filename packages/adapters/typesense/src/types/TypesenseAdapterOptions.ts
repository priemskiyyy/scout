import type { TypesenseProfile } from "src/types/TypesenseProfile";
import type { TypesenseSearchClient } from "src/types/TypesenseSearchClient";

/**
 * The collection to search on a Typesense client the application owns.
 *
 * @example
 * ```ts
 * const options: TypesenseAdapterOptions = {
 *   client, collection: "products", profiles: { exact: { prefix: false } },
 * };
 * ```
 * @see [typesense adapter](https://priemskiyyy.github.io/scout/adapters.html#typesense)
 */
export type TypesenseAdapterOptions = {
  /** The client the application owns. The adapter never closes it. */
  client: TypesenseSearchClient;
  collection: string;
  /** Tuning for the index's profiles, keyed by profile name. */
  profiles?: Readonly<Record<string, TypesenseProfile>>;
};
