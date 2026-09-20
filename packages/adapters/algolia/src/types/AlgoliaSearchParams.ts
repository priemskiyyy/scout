/**
 * The search parameters this adapter sends. The named fields are the ones it
 * owns, and the index signature is what carries an application's own parameters
 * from `.provider()` and from a profile.
 *
 * @example
 * ```ts
 * const params: AlgoliaSearchParams = { query: "headphones", page: 0, hitsPerPage: 20 };
 * ```
 * @see [algolia adapter](https://priemskiyyy.github.io/scout/adapters.html#algolia)
 */
export type AlgoliaSearchParams = {
  query?: string | undefined;
  filters?: string | undefined;
  page?: number | undefined;
  hitsPerPage?: number | undefined;
  facets?: string[] | undefined;
  attributesToHighlight?: string[] | undefined;
  highlightPreTag?: string | undefined;
  highlightPostTag?: string | undefined;
  [key: string]: unknown;
};
