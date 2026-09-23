/**
 * What the pipeline asks MongoDB to add to every document it returns, read
 * back as `MongoSearchExtras`.
 *
 * @example
 * ```ts
 * const extras: MongoSearchExtrasExpression = {
 *   meta: "$$SEARCH_META",
 *   score: { $meta: "searchScore" },
 * };
 * ```
 * @see [mongodb adapter](https://priemskiyyy.github.io/scout/adapters.html#mongodb-search)
 */
export type MongoSearchExtrasExpression = {
  readonly meta: "$$SEARCH_META";
  readonly score: { readonly $meta: "searchScore" };
  highlights?: { readonly $meta: "searchHighlights" };
};
