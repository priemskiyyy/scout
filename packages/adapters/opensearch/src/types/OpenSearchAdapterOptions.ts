import type { ElasticSearchSettings } from "@priemskiyyy/scout-elastic-dsl";

import type { OpenSearchSearchClient } from "src/types/OpenSearchSearchClient";

/**
 * The index to search on an OpenSearch client the application owns, and
 * what the adapter has to know about its mapping and limits.
 *
 * @example
 * ```ts
 * const options: OpenSearchAdapterOptions = {
 *   client, index: "products", keywords: { brand: "brand.keyword" },
 * };
 * ```
 * @see [opensearch adapter](https://priemskiyyy.github.io/scout/adapters.html#opensearch)
 */
export type OpenSearchAdapterOptions = ElasticSearchSettings & {
  /** The client the application owns. The adapter never closes it. */
  client: OpenSearchSearchClient;
  /** The index, alias or pattern to search. */
  index: string;
};
