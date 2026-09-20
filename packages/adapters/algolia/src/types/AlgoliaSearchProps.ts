import type { AlgoliaSearchParams } from "src/types/AlgoliaSearchParams";

/**
 * What a search call names: one index, and the parameters for it.
 *
 * @example
 * ```ts
 * const request: AlgoliaSearchProps = { indexName: "products", searchParams: { query: "shoe" } };
 * ```
 * @see [algolia adapter](https://priemskiyyy.github.io/scout/adapters.html#algolia)
 */
export type AlgoliaSearchProps = {
  indexName: string;
  searchParams?: AlgoliaSearchParams;
};
