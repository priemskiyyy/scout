import type { MongoSearchCollection } from "src/types/MongoSearchCollection";

/**
 * The collection to search, through a client the application owns.
 *
 * @example
 * ```ts
 * const options: MongoSearchAdapterOptions = {
 *   collection: client.db("shop").collection("products"),
 *   index: "products",
 *   tokens: ["brand", "category"],
 * };
 * ```
 * @see [mongodb adapter](https://priemskiyyy.github.io/scout/adapters.html#mongodb-search)
 */
export type MongoSearchAdapterOptions = {
  /** The collection the application owns. The adapter never closes its client. */
  collection: MongoSearchCollection;
  /** The search index's name. MongoDB's own default is `"default"`. */
  index?: string;
  /**
   * The fields the search index maps as `token`. MongoDB Search compares a
   * string exactly, and facets one, only on such a field, so a string filter
   * or facet on any other field is refused.
   */
  tokens?: readonly string[];
  /**
   * Count every match. By default MongoDB Search counts exactly up to 1000
   * and answers 1001 above it, which Scout reports as a lower bound.
   */
  exactTotals?: boolean;
};
