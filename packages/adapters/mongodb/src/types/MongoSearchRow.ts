import type { MongoSearchExtras } from "src/types/MongoSearchExtras";

/**
 * One document as the pipeline returns it, with the adapter's extras under
 * `__scout`, which is kept whole on `hit.native`.
 *
 * @example
 * ```ts
 * const row: MongoSearchRow = { _id: "p1", name: "Shoe", __scout: { meta: {}, score: 1 } };
 * ```
 * @see [mongodb adapter](https://priemskiyyy.github.io/scout/adapters.html#mongodb-search)
 */
export type MongoSearchRow = {
  readonly __scout: MongoSearchExtras;
  readonly [field: string]: unknown;
};
