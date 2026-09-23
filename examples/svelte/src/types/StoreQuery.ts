import type {
  CreateInfiniteQueryResult,
  InfiniteData,
} from "@tanstack/svelte-query";

import type { StoreResult } from "examples/shared/outpost/types/StoreResult";

/** The store's search as TanStack Query runs it: an infinite list of pages. */
export type StoreQuery = CreateInfiniteQueryResult<
  InfiniteData<StoreResult>,
  Error
>;
