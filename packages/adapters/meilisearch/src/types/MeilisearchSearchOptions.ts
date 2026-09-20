/**
 * The Meilisearch search parameters Scout does not own, so a profile or a
 * `.provider()` call can set them. Scout owns `q`, `filter`, `sort`, `facets`,
 * the pagination pair and the three highlight keys, which is what
 * `reservedOptions` says.
 *
 * @example
 * ```ts
 * const options: MeilisearchSearchOptions = { attributesToSearchOn: ["name"], matchingStrategy: "all" };
 * ```
 * @see [meilisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#meilisearch)
 */
export type MeilisearchSearchOptions = {
  attributesToSearchOn?: string[] | null;
  attributesToRetrieve?: string[];
  attributesToCrop?: string[];
  cropLength?: number;
  cropMarker?: string;
  matchingStrategy?: "all" | "last" | "frequency";
  rankingScoreThreshold?: number;
  showRankingScore?: boolean;
  distinct?: string;
  locales?: string[];
};
