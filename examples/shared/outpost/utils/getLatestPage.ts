import type { StorePages } from "examples/shared/outpost/types/StorePages";

/** The page the store fetched last, which carries the newest total and facets. */
export const getLatestPage = (query: Pick<StorePages, "data">) => {
  if (query.data === undefined) {
    return null;
  }

  return query.data.pages.at(-1) ?? null;
};
