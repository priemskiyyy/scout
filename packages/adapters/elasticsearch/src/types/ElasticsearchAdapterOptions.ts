import type { ElasticSearchSettings } from "@priemskiyyy/scout-elastic-dsl";

import type { ElasticsearchSearchClient } from "src/types/ElasticsearchSearchClient";

/**
 * The index to search on an Elasticsearch client the application owns, and
 * what the adapter has to know about its mapping and limits.
 *
 * @example
 * ```ts
 * const options: ElasticsearchAdapterOptions = {
 *   client, index: "products", keywords: { brand: "brand.keyword" },
 * };
 * ```
 * @see [elasticsearch adapter](https://priemskiyyy.github.io/scout/adapters.html#elasticsearch)
 */
export type ElasticsearchAdapterOptions = ElasticSearchSettings & {
  /** The client the application owns. The adapter never closes it. */
  client: ElasticsearchSearchClient;
  /** The index, alias or pattern to search. */
  index: string;
};
