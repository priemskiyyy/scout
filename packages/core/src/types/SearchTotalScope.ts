/**
 * Whether a total counts every matching document or only the ones pagination
 * can actually reach. The two differ whenever a provider limits pagination
 * depth, as Algolia does through `paginationLimitedTo`.
 *
 * @example
 * ```ts
 * const scope: SearchTotalScope = "retrievable";
 * ```
 *
 * @see [SearchTotal usage](https://priemskiyyy.github.io/scout/pagination.html)
 */
export type SearchTotalScope = "matches" | "retrievable";
