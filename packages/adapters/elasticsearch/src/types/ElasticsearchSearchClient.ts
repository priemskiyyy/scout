import type { ElasticSearchResponseBody } from "@priemskiyyy/scout-elastic-dsl";

import type { ElasticsearchSearchRequest } from "src/types/ElasticsearchSearchRequest";

/**
 * The part of an Elasticsearch client the adapter uses. A real `Client`
 * satisfies it, and so does any object with the same shape.
 *
 * @example
 * ```ts
 * const client: ElasticsearchSearchClient = new Client({ node, auth: { apiKey } });
 * ```
 * @see [elasticsearch adapter](https://priemskiyyy.github.io/scout/adapters.html#elasticsearch)
 */
export type ElasticsearchSearchClient = {
  search(
    request: ElasticsearchSearchRequest,
    options: { signal: AbortSignal },
  ): Promise<ElasticSearchResponseBody>;
};
