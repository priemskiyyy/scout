import type { AlgoliaHit } from "src/types/AlgoliaHit";
import type { AlgoliaExhaustive } from "src/types/AlgoliaExhaustive";

/**
 * The part of an Algolia search response this adapter reads. Every field is
 * optional because Algolia's own typings make them optional: `responseFields`
 * can remove any of them, and the adapter reports `"unknown"` rather than
 * inventing a number when one is missing.
 *
 * @example
 * ```ts
 * const response: AlgoliaSearchResponse = { hits: [], nbHits: 0, exhaustive: { nbHits: true } };
 * ```
 * @see [algolia adapter](https://priemskiyyy.github.io/scout/adapters.html#algolia)
 */
export type AlgoliaSearchResponse = {
  hits: readonly AlgoliaHit[];
  nbHits?: number | undefined;
  /** Zero based. Scout page 1 is Algolia page 0. */
  page?: number | undefined;
  nbPages?: number | undefined;
  hitsPerPage?: number | undefined;
  exhaustive?: AlgoliaExhaustive | undefined;
  facets?:
    Readonly<Record<string, Readonly<Record<string, number>>>> | undefined;
  processingTimeMS?: number | undefined;
  queryID?: string | undefined;
};
