/**
 * Every sort this adapter can honour. MiniSearch orders by BM25 score and
 * offers nothing else, so a declared sort name is an alias for relevance or it
 * is not supported.
 *
 * @example
 * ```ts
 * const order: MiniSearchSort = "relevance";
 * ```
 * @see [minisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#minisearch)
 */
export type MiniSearchSort = "relevance";
