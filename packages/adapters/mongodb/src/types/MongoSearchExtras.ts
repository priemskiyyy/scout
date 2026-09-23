import type { MongoSearchHighlight } from "src/types/MongoSearchHighlight";
import type { MongoSearchMeta } from "src/types/MongoSearchMeta";

/**
 * What the pipeline adds to every document it returns: the search's metadata,
 * the document's score and, when asked for, its highlights.
 *
 * @example
 * ```ts
 * const extras: MongoSearchExtras = { meta: { count: { total: 3 } }, score: 1.2 };
 * ```
 * @see [mongodb adapter](https://priemskiyyy.github.io/scout/adapters.html#mongodb-search)
 */
export type MongoSearchExtras = {
  readonly meta: MongoSearchMeta;
  readonly score: number;
  readonly highlights?: readonly MongoSearchHighlight[];
};
