import type { MeilisearchSearchParams } from "src/types/MeilisearchSearchParams";
import type { MeilisearchSearchResponse } from "src/types/MeilisearchSearchResponse";

/**
 * The injected Meilisearch index client, typed structurally so this package
 * imports no SDK. `meilisearch`'s own `Index` satisfies it, which
 * `meilisearch.contracts.ts` pins against the real types.
 *
 * @example
 * ```ts
 * const indexClient: MeilisearchIndexClient = client.index("products");
 * ```
 * @see [meilisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#meilisearch)
 */
export type MeilisearchIndexClient = {
  uid: string;
  search: (
    query?: string | null,
    options?: MeilisearchSearchParams,
    extraRequestInit?: { signal?: AbortSignal | null },
  ) => Promise<MeilisearchSearchResponse>;
};
