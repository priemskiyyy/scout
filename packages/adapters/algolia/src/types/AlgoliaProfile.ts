import type { AlgoliaSearchParams } from "src/types/AlgoliaSearchParams";

/**
 * One named profile, as the Algolia parameters it adds to every search.
 *
 * @example
 * ```ts
 * const strict: AlgoliaProfile = { searchParams: { typoTolerance: false } };
 * ```
 * @see [algolia adapter](https://priemskiyyy.github.io/scout/adapters.html#algolia)
 */
export type AlgoliaProfile = {
  searchParams?: AlgoliaSearchParams;
};
