import type { QueryKey } from "@tanstack/react-query";

import type { QueryKeySummary } from "examples/shared/outpost/types/QueryKeySummary";

/**
 * A Scout key is `["scout", index, identity]`, and an infinite list's key
 * puts `"infinite"` after the namespace, so both read the same way here.
 *
 * @example
 * ```ts
 * getQueryKeySummary(["scout", "infinite", "api", "{...}"]);
 * // { index: "api", infinite: true, identity: "{...}" }
 * ```
 */
export const getQueryKeySummary = (key: QueryKey): QueryKeySummary => {
  const infinite = key[1] === "infinite";

  if (infinite) {
    return { index: String(key[2]), infinite, identity: String(key.at(-1)) };
  }

  return { index: String(key[1]), infinite, identity: String(key.at(-1)) };
};
