import { create, insert } from "@orama/orama";
import type { OramaSearchProfile } from "src/types/OramaSearchProfile";
import type { OramaSearchSort } from "src/types/OramaSearchSort";

/** One document in the fixture corpus. */
export type Product = {
  id: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  price: number;
  inStock: boolean;
};

/**
 * A corpus small enough to reason about and shaped to catch the two mistakes
 * an Orama adapter can make quietly: `brand` and `category` hold values of
 * several tokens, so a token match answers differently from an exact one, and
 * `Café` is there so a multi-byte term is exercised rather than assumed.
 */
export const PRODUCTS: readonly Product[] = [
  {
    id: "p1",
    name: "Wireless Headphones",
    description: "Noise cancelling over ear headphones",
    brand: "Acme Audio",
    category: "audio gear",
    price: 199,
    inStock: true,
  },
  {
    id: "p2",
    name: "Wired Headphones",
    description: "Studio monitor headphones",
    brand: "Acme Audio",
    category: "audio gear",
    price: 99,
    inStock: false,
  },
  {
    id: "p3",
    name: "Mechanical Keyboard",
    description: "Tactile switches and a steel plate",
    brand: "Beta Input",
    category: "input",
    price: 149,
    inStock: true,
  },
  {
    id: "p4",
    name: "Wireless Mouse",
    description: "Ergonomic shape for long sessions",
    brand: "Beta Input",
    category: "input",
    price: 49,
    inStock: true,
  },
  {
    id: "p5",
    name: "Café Grande Mug",
    description: "Ünicode safe ceramic mug",
    brand: "Delta Home",
    category: "kitchen",
    price: 15,
    inStock: false,
  },
  {
    id: "p6",
    name: "Desk Lamp",
    description: "Warm light for a dark corner",
    brand: "Delta Home",
    category: "kitchen",
    price: 35,
    inStock: true,
  },
];

/** The sorts the fixture adapter covers. */
export const PRODUCT_SORTS = {
  relevance: {},
  priceAsc: { sortBy: { property: "price", order: "ASC" } },
  priceDesc: { sortBy: { property: "price", order: "DESC" } },
} satisfies Readonly<Record<string, OramaSearchSort>>;

/** The profiles the fixture adapter covers. */
export const PRODUCT_PROFILES = {
  default: {},
  names: { properties: ["name"] },
  forgiving: { tolerance: 2 },
} satisfies Readonly<Record<string, OramaSearchProfile>>;

/**
 * A fresh database holding the fixture corpus. Nothing is shared between two
 * of them, so a test that inserts cannot reach another test.
 *
 * `insert` answers synchronously for a database with no asynchronous
 * components, which is what `create` gives here.
 */
export const createProductDatabase = () => {
  const db = create({
    schema: {
      name: "string",
      description: "string",
      brand: "enum",
      category: "enum",
      price: "number",
      inStock: "boolean",
    },
  });
  for (const product of PRODUCTS) {
    insert(db, product);
  }
  return db;
};
