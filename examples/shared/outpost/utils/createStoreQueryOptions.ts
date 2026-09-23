import { infiniteQueryOptions } from "@priemskiyyy/scout-tanstack-query";

import type { StoreSearch } from "examples/shared/outpost/types/StoreSearch";
import { getEitherSignal } from "examples/shared/outpost/utils/getEitherSignal";

/**
 * The store's infinite query. TanStack Query's own signal reaches Scout, and
 * so does the store's Stop button, through a signal of the page's own that
 * aborts alongside it.
 *
 * @example
 * ```ts
 * useInfiniteQuery(createStoreQueryOptions(search, () => stop.current.signal));
 * ```
 */
export const createStoreQueryOptions = (
  search: StoreSearch,
  getStopSignal: () => AbortSignal,
) => {
  const options = infiniteQueryOptions(search);

  return {
    ...options,
    queryFn: ({ pageParam, signal }: Parameters<typeof options.queryFn>[0]) =>
      options.queryFn({
        pageParam,
        signal: getEitherSignal(signal, getStopSignal()),
      }),
  };
};
