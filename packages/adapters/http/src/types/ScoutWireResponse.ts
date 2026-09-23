import type { SearchTotal } from "@priemskiyyy/scout";

import type { ScoutWireHit } from "src/types/ScoutWireHit";

/**
 * The answer a backend gives for one search. Only `hits` is required: a
 * total, a facet's exhaustiveness, a time or highlights left out are reported
 * as unknown or empty rather than guessed.
 *
 * - `total` is how many documents matched, and how sure the backend is.
 * - `facets` holds each requested facet's buckets, with values as the backend
 *   stores them. Scout decodes them to the index's declared types.
 * - `took` is the backend's own time in milliseconds.
 * - `retrievable` is how many hits paging can reach, when the backend stops
 *   paging before its total.
 *
 * @example
 * ```ts
 * const answer: ScoutWireResponse = {
 *   hits: [{ document: { id: "1" } }],
 *   total: { value: 1, accuracy: "exact", scope: "matches" },
 * };
 * ```
 * @see [http adapter](https://priemskiyyy.github.io/scout/adapters.html#http-your-own-endpoint)
 */
export type ScoutWireResponse = {
  hits: readonly ScoutWireHit[];
  total?: SearchTotal;
  facets?: Readonly<
    Record<
      string,
      {
        values: readonly {
          value: string | number | boolean;
          count: number;
        }[];
        exhaustive?: boolean;
      }
    >
  >;
  took?: number;
  retrievable?: number;
};
