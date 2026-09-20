import type { OramaHit } from "src/types/OramaHit";
import type { OramaElapsed } from "src/types/OramaElapsed";
import type { OramaFacetResult } from "src/types/OramaFacetResult";

/**
 * What Orama's `search` answers with.
 *
 * @example
 * ```ts
 * const response: OramaResponse<{ name: string }> = { count: 0, hits: [] };
 * ```
 * @see [orama adapter](https://priemskiyyy.github.io/scout/adapters.html#orama)
 */
export type OramaResponse<TDocument> = {
  count: number;
  hits: readonly OramaHit<TDocument>[];
  elapsed?: OramaElapsed;
  facets?: Readonly<Record<string, OramaFacetResult>>;
};
