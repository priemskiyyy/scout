import type { OramaElapsed } from "src/types/OramaElapsed";
import type { OramaFacetResult } from "src/types/OramaFacetResult";
import type { OramaHit } from "src/types/OramaHit";

/**
 * What Orama's `search` answers with.
 *
 * @example
 * ```ts
 * const response: OramaResponse<{ name: string }> = { count: 0, hits: [], elapsed: { raw: 1 } };
 * ```
 * @see [orama adapter](https://priemskiyyy.github.io/scout/adapters.html#orama)
 */
export type OramaResponse<TDocument> = {
  count: number;
  hits: readonly OramaHit<TDocument>[];
  elapsed: OramaElapsed;
  facets?: Readonly<Record<string, OramaFacetResult>>;
};
