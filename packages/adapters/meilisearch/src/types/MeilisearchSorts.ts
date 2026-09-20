import type { MeilisearchSortDefinition } from "src/types/MeilisearchSortDefinition";

/**
 * The named orders available through the portable sort method.
 *
 * @example
 * ```ts
 * const sorts: MeilisearchSorts = { relevance: {}, priceAsc: { sort: ["price:asc"] } };
 * ```
 * @see [meilisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#meilisearch)
 */
export type MeilisearchSorts = Readonly<
  Record<string, MeilisearchSortDefinition>
>;
