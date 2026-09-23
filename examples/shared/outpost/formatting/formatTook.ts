import type { SearchResult } from "@priemskiyyy/scout";

import { formatDuration } from "examples/shared/outpost/formatting/formatDuration";

/** How long a search took, and who measured it. */
export const formatTook = (took: SearchResult<unknown>["took"]) => {
  if (took.source === "provider") {
    return `${formatDuration(took.milliseconds)}, reported by the engine`;
  }

  return `${formatDuration(took.milliseconds)}, measured by Scout`;
};
