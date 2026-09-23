import type { SearchAdapter } from "@priemskiyyy/scout";

import type { OramaDatabase } from "src/types/OramaDatabase";
import type { OramaHit } from "src/types/OramaHit";
import type { OramaResponse } from "src/types/OramaResponse";

/**
 * The adapter this package builds. It takes no provider options, because
 * everything Orama tunes per search belongs to a profile.
 *
 * @example
 * ```ts
 * const adapter: OramaSearchAdapter<typeof db, Product> = orama({ db, search, revision });
 * ```
 * @see [orama adapter](https://priemskiyyy.github.io/scout/adapters.html#orama)
 */
export type OramaSearchAdapter<
  TDatabase extends OramaDatabase,
  TDocument,
> = SearchAdapter<
  TDatabase,
  never,
  OramaHit<TDocument>,
  OramaResponse<TDocument>
>;
