import { create, insert, search } from "@orama/orama";
import { index } from "@priemskiyyy/scout";
import type { StandardSchema } from "@priemskiyyy/scout";

import type { OramaResponse } from "src/types/OramaResponse";
import type { OramaSearchParams } from "src/types/OramaSearchParams";
import type { OramaSearchProfile } from "src/types/OramaSearchProfile";

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

const isProduct = (value: unknown): value is Product =>
  typeof value === "object" &&
  value !== null &&
  typeof Object.getOwnPropertyDescriptor(value, "id")?.value === "string";

/** Reads a stored document back as the product it is. */
export const productSchema: StandardSchema<Product> = {
  "~standard": {
    version: 1,
    vendor: "orama-fixture",
    validate: (value) => {
      if (isProduct(value)) {
        return { value };
      }

      return { issues: [{ message: "Not a product." }] };
    },
  },
};

/**
 * The fixture corpus as an index declares it. `name` is highlightable only so
 * the conformance suite meets the adapter's refusal.
 */
export const productIndex = index({
  schema: productSchema,
  id: (product) => product.id,
  searchable: ["name", "description"],
  filterable: ["brand", "category", "price", "inStock"],
  facetable: { brand: "string", category: "string", inStock: "boolean" },
  highlightable: ["name"],
  sorts: { priceAsc: { price: "asc" }, priceDesc: { price: "desc" } },
  profiles: {
    names: { searchable: ["name"] },
    forgiving: { searchable: ["name", "description"] },
  },
});

/** The tuning the fixture adapter gives the index's profiles. */
export const PRODUCT_PROFILES: Readonly<Record<string, OramaSearchProfile>> = {
  forgiving: { tolerance: 2 },
};

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

type ProductDatabase = ReturnType<typeof createProductDatabase>;

// A method, so Orama's own generic `search` is accepted, the way the adapter
// options accept it.
const engine: {
  search(
    db: ProductDatabase,
    params: OramaSearchParams,
  ): OramaResponse<Product> | Promise<OramaResponse<Product>>;
} = { search };

/** Orama's own search over a fixture database, typed the way the adapter calls it. */
export const searchProducts = (
  db: ProductDatabase,
  params: OramaSearchParams,
) => engine.search(db, params);
