import type { MeilisearchSearchOptions } from "src/types/MeilisearchSearchOptions";

/**
 * The named search parameter sets available through an index profile.
 *
 * @example
 * ```ts
 * const profiles: MeilisearchProfiles = { default: {}, strict: { matchingStrategy: "all" } };
 * ```
 * @see [meilisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#meilisearch)
 */
export type MeilisearchProfiles = Readonly<
  Record<string, MeilisearchSearchOptions>
>;
