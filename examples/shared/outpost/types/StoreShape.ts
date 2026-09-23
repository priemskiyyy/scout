import type { IndexShapeOf, SearchAdapter } from "@priemskiyyy/scout";

import type { createProductIndex } from "examples/shared/outpost/utils/createProductIndex";

/**
 * The product index as the store sees it on every engine. The native slots
 * stay opaque, because the store uses only the portable contract.
 */
export type StoreShape = IndexShapeOf<
  ReturnType<typeof createProductIndex>,
  SearchAdapter
>;
