import type { ElasticSearchResponseBody } from "@priemskiyyy/scout-elastic-dsl";

import type { OpenSearchSearchRequest } from "src/types/OpenSearchSearchRequest";

/**
 * The part of an OpenSearch client the adapter uses. A real `Client`
 * satisfies it, and so does any object with the same shape.
 *
 * The client takes no `AbortSignal`. The promise a search returns carries
 * `abort()`, which is how the adapter cancels it.
 *
 * @example
 * ```ts
 * const client: OpenSearchSearchClient = new Client({ node });
 * ```
 * @see [opensearch adapter](https://priemskiyyy.github.io/scout/adapters.html#opensearch)
 */
export type OpenSearchSearchClient = {
  search(request: OpenSearchSearchRequest): Promise<{
    body: ElasticSearchResponseBody;
  }> & { abort: () => void };
};
