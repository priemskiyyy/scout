/**
 * One named sort, as the Meilisearch `sort` array it becomes.
 *
 * @example
 * ```ts
 * const priceAsc: MeilisearchSortDefinition = { sort: ["price:asc"] };
 * ```
 * @see [meilisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#meilisearch)
 */
export type MeilisearchSortDefinition = {
  sort?: string[];
};
