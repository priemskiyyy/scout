import type { FilterValue } from "@priemskiyyy/scout";

import type { MongoSearchCompound } from "src/types/MongoSearchCompound";

/**
 * The MongoDB Search operators this adapter writes. The driver does not type
 * the `$search` stage, so these follow MongoDB's own documentation.
 *
 * @example
 * ```ts
 * const acme: MongoSearchOperator = { equals: { path: "brand", value: "Acme" } };
 * ```
 * @see [mongodb adapter](https://priemskiyyy.github.io/scout/adapters.html#mongodb-search)
 */
export type MongoSearchOperator =
  | {
      readonly text: {
        readonly query: string;
        readonly path: readonly string[];
      };
    }
  | { readonly exists: { readonly path: string } }
  | { readonly equals: { readonly path: string; readonly value: FilterValue } }
  | {
      readonly in: {
        readonly path: string;
        readonly value: readonly FilterValue[];
      };
    }
  | {
      readonly range: {
        readonly path: string;
        readonly gt?: number;
        readonly gte?: number;
        readonly lt?: number;
        readonly lte?: number;
      };
    }
  | { readonly compound: MongoSearchCompound };
