import type { SortDirection } from "@priemskiyyy/scout";

/**
 * One field of a sort, in the query language's `sort` array.
 *
 * @example
 * ```ts
 * const cheapest: ElasticSortClause = { price: { order: "asc" } };
 * ```
 */
export type ElasticSortClause = Record<string, { order: SortDirection }>;
