import type { SearchTotal } from "@priemskiyyy/scout";

import { formatCount } from "examples/shared/outpost/formatting/formatCount";
import { assertUnreachable } from "examples/shared/outpost/utils/assertUnreachable";

/**
 * A total in words that claim no more than the engine did: "About" for an
 * estimate, "At least" for a lower bound, and no number when there is none.
 *
 * @example
 * ```ts
 * formatTotal({ value: 40, accuracy: "estimated", scope: "matches" }); // "About 40 results"
 * ```
 */
export const formatTotal = (total: SearchTotal) => {
  if (total.accuracy === "unknown") {
    return "Results, count unknown";
  }

  if (total.accuracy === "exact") {
    return formatCount(total.value, "result");
  }

  if (total.accuracy === "estimated") {
    return `About ${formatCount(total.value, "result")}`;
  }

  if (total.accuracy === "lower-bound") {
    return `At least ${formatCount(total.value, "result")}`;
  }

  return assertUnreachable(total.accuracy);
};
