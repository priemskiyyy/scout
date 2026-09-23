import { ScoutError } from "@priemskiyyy/scout";
import type { DefaultOptions } from "@tanstack/query-core";

/**
 * Scout sets no caching or retry defaults, so every example chooses them
 * here, once: a refusal is final, and an engine that failed gets one retry.
 */
export const QUERY_DEFAULTS: DefaultOptions = {
  queries: {
    staleTime: 30_000,
    retry: (failureCount, error) =>
      error instanceof ScoutError &&
      error.code === "provider" &&
      failureCount < 1,
  },
};
