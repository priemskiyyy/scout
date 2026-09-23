import type { ElasticSearchBody } from "@priemskiyyy/scout-elastic-dsl";

/**
 * What the adapter sends to `client.search`: the index, and the search body
 * under `body`, as the client takes it.
 *
 * @example
 * ```ts
 * const request: OpenSearchSearchRequest = {
 *   index: "products", body: { query: { match_all: {} }, from: 0, size: 20 },
 * };
 * ```
 * @see [opensearch adapter](https://priemskiyyy.github.io/scout/adapters.html#opensearch)
 */
export type OpenSearchSearchRequest = {
  index: string;
  body: ElasticSearchBody;
};
