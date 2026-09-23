import type { AdapterSearchRequest } from "@priemskiyyy/scout";

import type { MeilisearchSearchParams } from "src/types/MeilisearchSearchParams";

/**
 * The pagination parameters for one page: `page` and `hitsPerPage` in page
 * mode, `offset` and `limit` in offset mode.
 *
 * @example
 * ```ts
 * getPaginationParameters({ current: 2, size: 20 }, "page");
 * // { page: 2, hitsPerPage: 20 }
 * ```
 */
export const getPaginationParameters = (
  page: AdapterSearchRequest["page"],
  pagination: "page" | "offset",
): MeilisearchSearchParams => {
  if (pagination === "offset") {
    return { offset: (page.current - 1) * page.size, limit: page.size };
  }

  return { page: page.current, hitsPerPage: page.size };
};
