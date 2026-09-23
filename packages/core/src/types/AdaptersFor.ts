import type { AnySearchAdapter } from "src/types/AnySearchAdapter";

/**
 * One adapter per declared index.
 *
 * @example
 * ```ts
 * const adapters: AdaptersFor<{ products: typeof products }> = {
 *   products: typesense({ client, collection: "products" }),
 * };
 * ```
 */
export type AdaptersFor<TIndexes> = {
  readonly [TName in keyof TIndexes]: AnySearchAdapter;
};
