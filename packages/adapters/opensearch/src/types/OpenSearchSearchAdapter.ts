import type { SearchAdapter } from "@priemskiyyy/scout";
import type {
  ElasticHit,
  ElasticSearchOptions,
  ElasticSearchResponseBody,
} from "@priemskiyyy/scout-elastic-dsl";

import type { OpenSearchSearchClient } from "src/types/OpenSearchSearchClient";

/**
 * The adapter this package builds.
 *
 * @example
 * ```ts
 * const adapter: OpenSearchSearchAdapter = opensearch({ client, index: "products" });
 * ```
 * @see [opensearch adapter](https://priemskiyyy.github.io/scout/adapters.html#opensearch)
 */
export type OpenSearchSearchAdapter = SearchAdapter<
  OpenSearchSearchClient,
  ElasticSearchOptions,
  ElasticHit,
  ElasticSearchResponseBody
>;
