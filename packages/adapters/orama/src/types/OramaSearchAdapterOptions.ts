import type { OramaDatabase } from "src/types/OramaDatabase";
import type { OramaResponse } from "src/types/OramaResponse";
import type { OramaSearchParams } from "src/types/OramaSearchParams";
import type { OramaSearchProfile } from "src/types/OramaSearchProfile";

/**
 * How the application wires its own Orama database into Scout.
 *
 * `search` is Orama's own `search` function, passed beside the database
 * because Orama exports it as a function rather than as a method. It is
 * declared as a method so the real generic signature is accepted; the shapes
 * actually exchanged are pinned in `orama.contracts.ts`.
 *
 * `revision` is the application's own corpus version. Scout does not watch
 * the database, so nothing else can tell a cached query that the corpus
 * underneath it changed.
 *
 * @example
 * ```ts
 * const options: OramaSearchAdapterOptions<typeof db, Product> = {
 *   db, search, revision: () => corpusVersion, profiles: { forgiving: { tolerance: 2 } },
 * };
 * ```
 * @see [orama adapter](https://priemskiyyy.github.io/scout/adapters.html#orama)
 */
export type OramaSearchAdapterOptions<
  TDatabase extends OramaDatabase,
  TDocument,
> = {
  db: TDatabase;
  search(
    db: TDatabase,
    params: OramaSearchParams,
  ): OramaResponse<TDocument> | Promise<OramaResponse<TDocument>>;
  revision: () => string | number;
  /** Tuning for the index's profiles, keyed by profile name. */
  profiles?: Readonly<Record<string, OramaSearchProfile>>;
};
