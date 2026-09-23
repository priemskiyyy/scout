import { index } from "@priemskiyyy/scout";
import type { StandardSchema } from "@priemskiyyy/scout";
import Fuse from "fuse.js";
import type { IFuseOptions } from "fuse.js";

export const PRODUCTS = [
  {
    id: "p1",
    title: "Running shoe",
    category: "footwear",
    price: 90,
    tags: ["sport", "sale"],
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
    tags: ["sale"],
  },
  {
    id: "p5",
    title: "Shoe rack",
    category: "storage",
    price: 45,
    tags: ["sale"],
  },
];

export type Product = (typeof PRODUCTS)[number];

const isProduct = (value: unknown): value is Product =>
  typeof value === "object" &&
  value !== null &&
  typeof Object.getOwnPropertyDescriptor(value, "id")?.value === "string";

/** Reads a corpus document back as the product it is. */
export const productSchema: StandardSchema<Product> = {
  "~standard": {
    version: 1,
    vendor: "fuse-fixture",
    validate: (value) => {
      if (isProduct(value)) {
        return { value };
      }

      return { issues: [{ message: "Not a product." }] };
    },
  },
};

/**
 * The corpus as an index declares it. Fuse cannot count `category`, so the
 * conformance suite sees that facet refused.
 */
export const productIndex = index({
  schema: productSchema,
  id: (product) => product.id,
  searchable: ["title", "tags"],
  filterable: ["category", "price", "tags"],
  facetable: { category: "string" },
  highlightable: ["title"],
  sorts: { priceAsc: { price: "asc" } },
  profiles: { titles: { searchable: ["title"] } },
});

/** A real Fuse over the corpus, keyed by the index's searchable fields. */
export const createProductIndex = (options: IFuseOptions<Product> = {}) =>
  new Fuse(PRODUCTS, {
    keys: ["title", "tags"],
    threshold: 0.3,
    shouldSort: false,
    includeMatches: true,
    includeScore: true,
    ...options,
  });
