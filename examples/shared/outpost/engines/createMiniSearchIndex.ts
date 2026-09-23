import MiniSearch from "minisearch";

import { PRODUCTS } from "examples/shared/outpost/constants/products";
import type { Product } from "examples/shared/outpost/types/Product";

/**
 * The catalogue as a MiniSearch index. Every schema field is stored, because
 * a hit carries only what MiniSearch stored.
 *
 * @example
 * ```ts
 * const catalogue = createMiniSearchIndex();
 * ```
 */
export const createMiniSearchIndex = () => {
  const catalogue = new MiniSearch<Product>({
    fields: ["name", "description", "tags"],
    storeFields: [
      "id",
      "name",
      "description",
      "brand",
      "category",
      "price",
      "rating",
      "inStock",
      "tags",
    ],
  });

  catalogue.addAll([...PRODUCTS]);

  return catalogue;
};
