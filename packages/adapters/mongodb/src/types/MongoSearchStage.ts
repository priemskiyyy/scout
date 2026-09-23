import type { MongoSearchCompound } from "src/types/MongoSearchCompound";
import type { MongoSearchOperator } from "src/types/MongoSearchOperator";

/**
 * One `$search` stage as this adapter writes it: a `compound` operator, or the
 * `facet` collector around one when facets are requested.
 *
 * @example
 * ```ts
 * const stage: MongoSearchStage = {
 *   index: "default",
 *   compound: { must: [{ text: { query: "shoe", path: ["name"] } }] },
 *   count: { type: "lowerBound" },
 * };
 * ```
 * @see [mongodb adapter](https://priemskiyyy.github.io/scout/adapters.html#mongodb-search)
 */
export type MongoSearchStage = {
  index: string;
  compound?: MongoSearchCompound;
  facet?: {
    readonly operator: MongoSearchOperator;
    readonly facets: Readonly<
      Record<string, { readonly type: "string"; readonly path: string }>
    >;
  };
  count: { readonly type: "total" | "lowerBound" };
  highlight?: { readonly path: readonly string[] };
  sort?: Readonly<Record<string, 1 | -1>>;
  concurrent?: boolean;
  returnStoredSource?: boolean;
  tracking?: { readonly searchTerms: string };
};
