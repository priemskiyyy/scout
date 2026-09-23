import type { SearchAdapter } from "@priemskiyyy/scout";

import type { MeilisearchIndexClient } from "src/types/MeilisearchIndexClient";
import type { MeilisearchSearchHit } from "src/types/MeilisearchSearchHit";
import type { MeilisearchSearchOptions } from "src/types/MeilisearchSearchOptions";
import type { MeilisearchSearchResponse } from "src/types/MeilisearchSearchResponse";

/**
 * The adapter this package builds.
 *
 * @example
 * ```ts
 * const adapter: MeilisearchSearchAdapter = meilisearch({ index: client.index("products") });
 * ```
 * @see [meilisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#meilisearch)
 */
export type MeilisearchSearchAdapter = SearchAdapter<
  MeilisearchIndexClient,
  MeilisearchSearchOptions,
  MeilisearchSearchHit,
  MeilisearchSearchResponse
>;
