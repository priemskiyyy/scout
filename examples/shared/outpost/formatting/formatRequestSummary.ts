import type { AdapterSearchRequest } from "@priemskiyyy/scout";

/**
 * One request in a line: its query, its page, and what else it asked for.
 *
 * @example
 * ```ts
 * formatRequestSummary(search); // '"tent" · page 1 of 8 · filtered · 3 facets'
 * ```
 */
export const formatRequestSummary = (search: AdapterSearchRequest) => {
  const parts = [
    JSON.stringify(search.query),
    `page ${search.page.current} of ${search.page.size}`,
  ];

  if (search.filter !== null) {
    parts.push("filtered");
  }

  if (search.facets.length > 0) {
    parts.push(`${search.facets.length} facets`);
  }

  if (search.highlights.length > 0) {
    parts.push("highlighted");
  }

  return parts.join(" · ");
};
