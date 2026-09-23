import { ScoutError } from "@priemskiyyy/scout";

import type { OramaDatabase } from "src/types/OramaDatabase";
import type { OramaSearchAdapter } from "src/types/OramaSearchAdapter";
import type { OramaSearchAdapterOptions } from "src/types/OramaSearchAdapterOptions";
import { NANOSECONDS_PER_MILLISECOND } from "src/utils/constants/units";
import { getFacetsFromResponse } from "src/utils/getFacetsFromResponse";
import { getHitsFromResponse } from "src/utils/getHitsFromResponse";
import { getSearchParameters } from "src/utils/getSearchParameters";
import { getTotalEntriesCountFromResponse } from "src/utils/getTotalEntriesCountFromResponse";

/**
 * Searches an Orama database the application owns, in the same process.
 * Bump `revision` whenever the corpus changes, so the same search over a
 * changed corpus is a different cached query.
 *
 * @example
 * ```ts
 * import { create, search } from "@orama/orama";
 *
 * const db = create({ schema: { name: "string", brand: "enum", price: "number" } });
 * let revision = 0;
 *
 * const adapter = orama({ db, search, revision: () => revision });
 * ```
 */
export const orama = <TDatabase extends OramaDatabase, TDocument>({
  db,
  search,
  revision,
  profiles,
}: OramaSearchAdapterOptions<TDatabase, TDocument>): OramaSearchAdapter<
  TDatabase,
  TDocument
> => ({
  name: "orama",
  native: db,
  fingerprint: () => `orama:${revision()}`,
  profiles,
  search: async (request) => {
    if (request.provider !== null) {
      throw new ScoutError({
        code: "configuration",
        message: "Orama takes no provider options. Tune a profile instead.",
      });
    }

    if (request.highlights.length > 0) {
      throw new ScoutError({
        code: "unsupported-feature",
        message: "Orama reports no match offsets, so it cannot highlight.",
      });
    }

    const response = await search(
      db,
      getSearchParameters(request, profiles?.[request.profile], db.schema),
    );

    return {
      hits: getHitsFromResponse(response),
      total: getTotalEntriesCountFromResponse(response),
      facets: getFacetsFromResponse(response),
      took: response.elapsed.raw / NANOSECONDS_PER_MILLISECOND,
      native: response,
    };
  },
});
