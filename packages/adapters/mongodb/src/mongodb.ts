import type { MongoSearchAdapter } from "src/types/MongoSearchAdapter";
import type { MongoSearchAdapterOptions } from "src/types/MongoSearchAdapterOptions";
import { RESERVED_OPTIONS } from "src/utils/constants/parameters";
import { getFacetsFromRows } from "src/utils/getFacetsFromRows";
import { getHitsFromRows } from "src/utils/getHitsFromRows";
import { getSearchPipeline } from "src/utils/getSearchPipeline";
import { getTotalEntriesCountFromRows } from "src/utils/getTotalEntriesCountFromRows";

/**
 * Searches one MongoDB collection through its MongoDB Search index, with a
 * client the application owns.
 *
 * @example
 * ```ts
 * const adapter = mongodb({
 *   collection: client.db("shop").collection("products"),
 *   index: "products",
 *   tokens: ["brand", "category"],
 * });
 * ```
 */
export const mongodb = ({
  collection,
  index = "default",
  tokens = [],
  exactTotals = false,
}: MongoSearchAdapterOptions): MongoSearchAdapter => ({
  name: "mongodb",
  native: collection,
  // The namespace and the search index decide the results. A connection
  // string never appears here, because the fingerprint reaches cache keys.
  fingerprint: () =>
    `${collection.dbName}.${collection.collectionName}/${index}`,
  reservedOptions: RESERVED_OPTIONS,
  search: async (request, { signal }) => {
    const rows = await collection
      .aggregate(getSearchPipeline(request, { index, tokens, exactTotals }), {
        signal,
      })
      .toArray();

    return {
      hits: getHitsFromRows(rows, request.highlights),
      total: getTotalEntriesCountFromRows(rows, request.page),
      facets: getFacetsFromRows(rows),
      took: null,
      native: rows,
    };
  },
});
