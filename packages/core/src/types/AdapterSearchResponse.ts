import type { AdapterSearchHit } from "src/types/AdapterSearchHit";
import type { SearchFacet } from "src/types/SearchFacet";
import type { SearchPage } from "src/types/SearchPage";
import type { SearchTotal } from "src/types/SearchTotal";

/**
 * One provider response, translated into Scout's vocabulary but not yet
 * validated. `took` is the engine's own processing time in milliseconds, or
 * null when it did not report one, in which case the core reports its own
 * measurement instead.
 *
 * @example
 * ```ts
 * const response: AdapterSearchResponse<never, null> = {
 *   hits: [], facets: {}, took: null, native: null,
 *   page: { kind: "page", current: 1, size: 20, next: null, previous: null },
 *   total: { value: 0, accuracy: "exact", scope: "matches" },
 * };
 * ```
 *
 * @see [createSearchAdapter usage](https://priemskiyyy.github.io/scout/writing-an-adapter.html)
 */
export type AdapterSearchResponse<
  TNativeHit = unknown,
  TNativeResponse = unknown,
> = {
  readonly hits: readonly AdapterSearchHit<TNativeHit>[];
  readonly page: SearchPage;
  readonly total: SearchTotal;
  readonly facets: Readonly<Record<string, SearchFacet<unknown>>>;
  readonly took: number | null;
  readonly native: TNativeResponse;
};
