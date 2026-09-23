import type { SearchPage } from "@priemskiyyy/scout";

/**
 * What the core derived about the next page, in words.
 *
 * @example
 * ```ts
 * formatNextPage("unknown"); // "Unknown, there might be more"
 * ```
 */
export const formatNextPage = (next: SearchPage["next"]) => {
  if (next === null) {
    return "None, this is the last page";
  }

  if (next === "unknown") {
    return "Unknown, there might be more";
  }

  return `Page ${next}`;
};
