import type { StorePages } from "examples/shared/outpost/types/StorePages";

/** The store's infinite query, unwrapped once so every component reads plain values. */
export type StoreView = StorePages & {
  isFetching: boolean;
  isFetchingNextPage: boolean;
  dataUpdatedAt: number;
};
