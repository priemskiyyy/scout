import type { ElasticSearchBody } from "@priemskiyyy/scout-elastic-dsl";

/**
 * What the adapter sends to `client.search`: the index, and the search body
 * beside it at the top level, as the client takes it.
 *
 * @example
 * ```ts
 * const request: ElasticsearchSearchRequest = {
 *   index: "products", query: { match_all: {} }, from: 0, size: 20,
 * };
 * ```
 * @see [elasticsearch adapter](https://priemskiyyy.github.io/scout/adapters.html#elasticsearch)
 */
export type ElasticsearchSearchRequest = ElasticSearchBody & { index: string };
