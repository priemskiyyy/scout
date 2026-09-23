import { formatTotal } from "examples/shared/outpost/formatting/formatTotal";
import type { StoreResult } from "examples/shared/outpost/types/StoreResult";

/**
 * The store's headline: the total when a page came back, a word while one is
 * on its way, and nothing after a failure, whose problem says why.
 *
 * @example
 * ```ts
 * formatStoreHeadline(null, true); // "Searching…"
 * ```
 */
export const formatStoreHeadline = (
  latest: StoreResult | null,
  searching: boolean,
) => {
  if (latest !== null) {
    return formatTotal(latest.total);
  }

  if (searching) {
    return "Searching…";
  }

  return "";
};
