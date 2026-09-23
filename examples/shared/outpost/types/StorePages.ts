import type { InfiniteData } from "@tanstack/query-core";

import type { StoreResult } from "examples/shared/outpost/types/StoreResult";

/**
 * The part of an infinite query's state the store reads. Every TanStack
 * Query binding has it, so the helpers that read it are shared by every
 * example.
 */
export type StorePages = {
  error: Error | null;
  data: InfiniteData<StoreResult> | undefined;
  isPlaceholderData: boolean;
};
