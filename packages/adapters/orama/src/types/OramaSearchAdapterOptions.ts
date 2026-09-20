import type { OramaDatabase } from "src/types/OramaDatabase";
import type { OramaSearchParams } from "src/types/OramaSearchParams";
import type { OramaResponse } from "src/types/OramaResponse";

/**
 * How the application wires its own Orama database into Scout.
 *
 * `search` is Orama's own `search` function, passed in beside the database
 * because Orama exports it as a function rather than as a method. It is
 * declared as a method here so the real generic signature is accepted; the
 * shapes actually exchanged are pinned in `orama.contracts.ts`.
 *
 * `revision` is the application's own corpus version. Scout does not watch the
 * database, so nothing else can tell a cached query that the corpus underneath
 * it changed.
 *
 * @example
 * ```ts
 * const adapter = orama({ db, search, revision: () => corpusVersion,
 *   profiles: { default: { properties: ["name"] } }, sorts: { relevance: {} } });
 * ```
 * @see [orama adapter](https://priemskiyyy.github.io/scout/adapters.html#orama)
 */
export type OramaSearchAdapterOptions<
  TDatabase extends OramaDatabase,
  TDocument,
  TSorts,
  TProfiles,
> = {
  db: TDatabase;
  search(
    db: TDatabase,
    params: OramaSearchParams,
  ): OramaResponse<TDocument> | Promise<OramaResponse<TDocument>>;
  revision: () => string | number;
  profiles: TProfiles;
  sorts: TSorts;
};
