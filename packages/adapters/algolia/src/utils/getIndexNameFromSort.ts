import { ScoutError } from "@priemskiyyy/scout";
import type { AdapterSort } from "@priemskiyyy/scout";

/**
 * The index a search reads: the primary one for relevance, and for any other
 * sort its replica, because Algolia has no per search sort.
 *
 * @example
 * ```ts
 * getIndexNameFromSort("products", { priceAsc: "products_price_asc" }, sort);
 * // "products_price_asc"
 * ```
 */
export const getIndexNameFromSort = (
  indexName: string,
  replicas: Readonly<Record<string, string>>,
  sort: AdapterSort | null,
): string => {
  if (sort === null) {
    return indexName;
  }

  const replica = replicas[sort.name];

  if (typeof replica !== "string") {
    throw new ScoutError({
      code: "configuration",
      message: `Algolia has no replica for the sort ${sort.name}. Add one under replicas.${sort.name}.`,
    });
  }

  return replica;
};
