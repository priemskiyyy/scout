import type { SearchTotal } from "@priemskiyyy/scout";

import { assertUnreachable } from "examples/shared/outpost/utils/assertUnreachable";

/**
 * How many results are on screen, against a total that claims no more than
 * the engine did.
 *
 * @example
 * ```ts
 * formatShown(8, { value: 40, accuracy: "estimated", scope: "matches" }); // "Showing 8 of about 40"
 * ```
 */
export const formatShown = (shown: number, total: SearchTotal) => {
  if (total.accuracy === "unknown") {
    return `Showing ${shown}`;
  }

  if (total.accuracy === "exact") {
    return `Showing ${shown} of ${total.value}`;
  }

  if (total.accuracy === "estimated") {
    return `Showing ${shown} of about ${total.value}`;
  }

  if (total.accuracy === "lower-bound") {
    return `Showing ${shown} of at least ${total.value}`;
  }

  return assertUnreachable(total.accuracy);
};
