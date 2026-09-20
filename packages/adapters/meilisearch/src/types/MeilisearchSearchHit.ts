/**
 * One Meilisearch hit: the document plus the keys Meilisearch adds to it.
 *
 * @example
 * ```ts
 * const hit: MeilisearchSearchHit = { id: "p1", name: "Headphones" };
 * ```
 * @see [meilisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#meilisearch)
 */
export type MeilisearchSearchHit = {
  _formatted?: Record<string, unknown>;
  [field: string]: unknown;
};
