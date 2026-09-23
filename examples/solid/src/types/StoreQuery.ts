import type {
  InfiniteData,
  UseInfiniteQueryResult,
} from "@tanstack/solid-query";

import type { StoreResult } from "examples/shared/outpost/types/StoreResult";

/** The store's search as TanStack Query runs it: an infinite list of pages. */
export type StoreQuery = UseInfiniteQueryResult<
  InfiniteData<StoreResult>,
  Error
>;
