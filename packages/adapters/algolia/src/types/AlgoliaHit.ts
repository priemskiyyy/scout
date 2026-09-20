import type { AlgoliaDocument } from "src/types/AlgoliaDocument";

/**
 * One hit with the metadata Algolia adds to it. Scout hands this whole object
 * back on `hit.native`, so `objectID` and `_highlightResult` stay reachable.
 *
 * @example
 * ```ts
 * const hit: AlgoliaHit = { objectID: "p1", name: "Headphones" };
 * ```
 * @see [algolia adapter](https://priemskiyyy.github.io/scout/adapters.html#algolia)
 */
export type AlgoliaHit = AlgoliaDocument & {
  objectID: string;
  _highlightResult?: Readonly<Record<string, unknown>> | undefined;
};
