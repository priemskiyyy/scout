import type { SearchAdapter } from "@priemskiyyy/scout";

import type { MongoSearchCollection } from "src/types/MongoSearchCollection";
import type { MongoSearchOptions } from "src/types/MongoSearchOptions";
import type { MongoSearchRow } from "src/types/MongoSearchRow";

/**
 * The adapter this package builds.
 *
 * @example
 * ```ts
 * const adapter: MongoSearchAdapter = mongodb({ collection, tokens: ["brand"] });
 * ```
 * @see [mongodb adapter](https://priemskiyyy.github.io/scout/adapters.html#mongodb-search)
 */
export type MongoSearchAdapter = SearchAdapter<
  MongoSearchCollection,
  MongoSearchOptions,
  MongoSearchRow,
  readonly MongoSearchRow[]
>;
