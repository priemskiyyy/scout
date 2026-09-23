import { create, insert } from "@orama/orama";

import { PRODUCTS } from "examples/shared/outpost/constants/products";

/**
 * The catalogue as an Orama database. `brand` and `category` are `enum`
 * rather than `string`, because Orama matches a string property by token and
 * Scout's `eq` means the whole value.
 *
 * @example
 * ```ts
 * const db = createOramaDatabase();
 * ```
 */
export const createOramaDatabase = () => {
  const db = create({
    schema: {
      name: "string",
      description: "string",
      brand: "enum",
      category: "enum",
      price: "number",
      rating: "number",
      inStock: "boolean",
      tags: "string[]",
    },
  });

  for (const product of PRODUCTS) {
    insert(db, product);
  }

  return db;
};
