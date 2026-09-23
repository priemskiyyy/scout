import type { FilterExpression, FilterFields } from "@priemskiyyy/scout";

import type { StoreShape } from "examples/shared/outpost/types/StoreShape";

/**
 * One filter the store's controls add, as the code that writes it and the
 * expression it builds, so the code the page shows is the search it runs.
 */
export type StoreClause = {
  code: string;
  build: (product: FilterFields<StoreShape>) => FilterExpression;
};
