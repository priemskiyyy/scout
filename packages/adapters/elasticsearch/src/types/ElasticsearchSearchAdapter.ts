import type { SearchAdapter } from "@priemskiyyy/scout";
import type {
  ElasticHit,
  ElasticSearchOptions,
  ElasticSearchResponseBody,
} from "@priemskiyyy/scout-elastic-dsl";

import type { ElasticsearchSearchClient } from "src/types/ElasticsearchSearchClient";

/**
 * The adapter this package builds.
 *
 * @example
 * ```ts
 * const adapter: ElasticsearchSearchAdapter = elasticsearch({ client, index: "products" });
 * ```
 * @see [elasticsearch adapter](https://priemskiyyy.github.io/scout/adapters.html#elasticsearch)
 */
export type ElasticsearchSearchAdapter = SearchAdapter<
  ElasticsearchSearchClient,
  ElasticSearchOptions,
  ElasticHit,
  ElasticSearchResponseBody
>;
