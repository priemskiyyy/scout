import type { MongoSearchPipelineStage } from "src/types/MongoSearchPipelineStage";
import type { MongoSearchRow } from "src/types/MongoSearchRow";

/**
 * The part of a driver `Collection` the adapter uses. A real `Collection`
 * satisfies it, which `src/mongodb.contracts.ts` pins.
 *
 * @example
 * ```ts
 * const collection: MongoSearchCollection = client.db("shop").collection("products");
 * ```
 * @see [mongodb adapter](https://priemskiyyy.github.io/scout/adapters.html#mongodb-search)
 */
export type MongoSearchCollection = {
  readonly dbName: string;
  readonly collectionName: string;
  aggregate(
    pipeline: MongoSearchPipelineStage[],
    options: { signal: AbortSignal },
  ): { toArray(): Promise<readonly MongoSearchRow[]> };
};
