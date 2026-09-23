import type { StoreSearch } from "examples/shared/outpost/types/StoreSearch";

/** One page of the store's search, as Scout answered it. */
export type StoreResult = Awaited<ReturnType<StoreSearch["execute"]>>;
