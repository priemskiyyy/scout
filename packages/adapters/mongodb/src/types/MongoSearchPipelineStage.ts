import type { MongoSearchExtrasExpression } from "src/types/MongoSearchExtrasExpression";
import type { MongoSearchStage } from "src/types/MongoSearchStage";

/**
 * One stage of the pipeline this adapter sends to `aggregate`.
 *
 * @example
 * ```ts
 * const page: MongoSearchPipelineStage = { $limit: 20 };
 * ```
 * @see [mongodb adapter](https://priemskiyyy.github.io/scout/adapters.html#mongodb-search)
 */
export type MongoSearchPipelineStage =
  | { readonly $search: MongoSearchStage }
  | { readonly $skip: number }
  | { readonly $limit: number }
  | { readonly $set: { readonly __scout: MongoSearchExtrasExpression } };
