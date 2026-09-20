import type { SearchAdapter } from "@priemskiyyy/scout";
import type { TypesenseSearchClient } from "src/types/TypesenseSearchClient";
import type { TypesenseSearchParameters } from "src/types/TypesenseSearchParameters";
import type { TypesenseHit } from "src/types/TypesenseHit";
import type { TypesenseSearchResponse } from "src/types/TypesenseSearchResponse";
import type { TypesenseSort } from "src/types/TypesenseSort";
import type { TypesenseProfile } from "src/types/TypesenseProfile";

/**
 * The adapter this package builds. `sorts` and `profiles` keep their declared
 * names, so an index that asks for a sort the configuration does not cover is a
 * compile error in the configuration rather than a surprise at a call site.
 *
 * @example
 * ```ts
 * const adapter: TypesenseSearchAdapter<"relevance", "default"> = typesense(options);
 * ```
 * @see [typesense adapter](https://priemskiyyy.github.io/scout/adapters.html#typesense)
 */
export type TypesenseSearchAdapter<
  TSortName extends string,
  TProfileName extends string,
> = SearchAdapter<
  TypesenseSearchClient,
  TypesenseSearchParameters,
  TypesenseHit,
  TypesenseSearchResponse | null
> & {
  sorts: Readonly<Record<TSortName, TypesenseSort>>;
  profiles: Readonly<Record<TProfileName, TypesenseProfile>>;
};
