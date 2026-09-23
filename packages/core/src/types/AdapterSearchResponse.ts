import type { AdapterFacet } from "src/types/AdapterFacet";
import type { AdapterSearchHit } from "src/types/AdapterSearchHit";
import type { SearchTotal } from "src/types/SearchTotal";

/**
 * One provider response in Scout's vocabulary, not yet validated. The core
 * derives the page from the total, the page size and how many hits came back.
 *
 * `facets` is keyed by requested field; one left out comes back with its
 * exhaustiveness unknown. `took` is the engine's own processing time in
 * milliseconds, or `null` when it reports none, and the core then measures.
 *
 * @example
 * ```ts
 * const response: AdapterSearchResponse<never, null> = {
 *   hits: [], total: { value: 0, accuracy: "exact", scope: "matches" },
 *   facets: {}, took: null, native: null,
 * };
 * ```
 *
 * @see [Writing an adapter](https://priemskiyyy.github.io/scout/writing-an-adapter.html)
 */
export type AdapterSearchResponse<
  TNativeHit = unknown,
  TNativeResponse = unknown,
> = {
  readonly hits: readonly AdapterSearchHit<TNativeHit>[];
  readonly total: SearchTotal;
  readonly facets: Readonly<Record<string, AdapterFacet>>;
  readonly took: number | null;
  /**
   * How many hits paging can reach, when the engine stops paging before its
   * total, as Algolia's `paginationLimitedTo` does. The core ends the pages
   * there, while `total` still counts every match.
   */
  readonly retrievable?: number | undefined;
  readonly native: TNativeResponse;
};
