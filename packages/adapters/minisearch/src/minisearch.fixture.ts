import { index } from "@priemskiyyy/scout";
import type { StandardSchema } from "@priemskiyyy/scout";
import MiniSearch from "minisearch";

/**
 * The corpus every test in this package searches. It is small and it
 * overlaps: several products share a category or a tag, and "shoe" reaches
 * more than one of them, so a dropped filter, a wrong sort and a wrongly cut
 * page each show up as different ids.
 */
export type Product = {
  id: string;
  title: string;
  category: string;
  price: number;
  tags: readonly string[];
};

export const PRODUCT_FIELDS = ["id", "title", "category", "price", "tags"];

export const PRODUCTS: readonly Product[] = [
  {
    id: "p1",
    title: "Running shoe",
    category: "footwear",
    price: 90,
    tags: ["sale", "sport"],
  },
  {
    id: "p2",
    title: "Trail shoe",
    category: "footwear",
    price: 140,
    tags: ["sport"],
  },
  {
    id: "p3",
    title: "Leather shoe",
    category: "footwear",
    price: 220,
    tags: ["formal"],
  },
  {
    id: "p4",
    title: "Shoe polish",
    category: "care",
    price: 8,
    tags: ["formal", "sale"],
  },
  {
    id: "p5",
    title: "Shoe rack",
    category: "storage",
    price: 45,
    tags: ["sale"],
  },
  {
    id: "p6",
    title: "Wool sock",
    category: "hosiery",
    price: 12,
    tags: ["sport"],
  },
];

/**
 * A real MiniSearch instance over the corpus. `storeFields` decides how much of
 * the document a result carries back, which is why the adapter takes a
 * resolver.
 *
 * @example
 * ```ts
 * const partial = createProductIndex({ storeFields: ["title"] });
 * ```
 */
export const createProductIndex = (
  options: { storeFields?: readonly string[] } = {},
): MiniSearch<Product> => {
  const storeFields = options.storeFields ?? PRODUCT_FIELDS;

  const products = new MiniSearch<Product>({
    fields: ["title", "category", "tags"],
    storeFields: [...storeFields],
  });

  products.addAll([...PRODUCTS]);

  return products;
};

/**
 * The resolver an application writes when its `storeFields` is a subset of the
 * schema: the id goes back to wherever the documents already live.
 */
export const resolveProduct = (id: unknown): Product => {
  const product = PRODUCTS.find((candidate) => candidate.id === id);

  if (product === undefined) {
    throw new Error(`No product for id ${String(id)}`);
  }

  return product;
};

const isProduct = (value: unknown): value is Product =>
  typeof value === "object" &&
  value !== null &&
  typeof Object.getOwnPropertyDescriptor(value, "id")?.value === "string" &&
  typeof Object.getOwnPropertyDescriptor(value, "title")?.value === "string" &&
  typeof Object.getOwnPropertyDescriptor(value, "price")?.value === "number";

/** Reads a stored document back as the product it is. */
export const productSchema: StandardSchema<Product> = {
  "~standard": {
    version: 1,
    vendor: "minisearch-fixture",
    validate: (value) => {
      if (isProduct(value)) {
        return { value };
      }

      return { issues: [{ message: "Not a product." }] };
    },
  },
};

/**
 * The corpus as an index declares it. Facets and highlights are declared so
 * the conformance suite sees them refused.
 */
export const productIndex = index({
  schema: productSchema,
  id: (product) => product.id,
  searchable: ["title", "category", "tags"],
  filterable: ["category", "price", "tags"],
  facetable: { category: "string" },
  highlightable: ["title"],
  sorts: {
    priceAsc: { price: "asc" },
    categoryThenPrice: { category: "asc", price: "desc" },
  },
  profiles: { titles: { searchable: ["title"] } },
});
