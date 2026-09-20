import { create, insert, search } from "@orama/orama";
import { index, Scout } from "@priemskiyyy/scout";
import type { IndexDeclaration } from "@priemskiyyy/scout";
import { fuse } from "@priemskiyyy/scout-fuse";
import { minisearch } from "@priemskiyyy/scout-minisearch";
import { orama } from "@priemskiyyy/scout-orama";
import MiniSearch from "minisearch";
import Fuse from "fuse.js";
import { PRODUCTS, ProductSchema } from "src/catalogue";
import type { Product } from "src/catalogue";

export const ENGINES = ["orama", "minisearch", "fuse"] as const;

export type Engine = (typeof ENGINES)[number];

/**
 * The fields and features shared by all three engines. Native slots stay opaque
 * because the UI uses only the portable contract.
 */
export type ProductShape = {
  document: Product;
  native: {
    client: unknown;
    options: never;
    hit: unknown;
    response: unknown;
  };
  filterable: "brand" | "category" | "price" | "inStock";
  facetable: "brand" | "category";
  highlightable: never;
  sort: "relevance";
  profile: "default";
};

// Increment this revision if the corpus changes, so cached searches get new keys.
const REVISION = 1;

const database = create({
  schema: {
    name: "string",
    description: "string",
    // `enum` rather than `string`, because Orama matches a string property by
    // token and Scout's `eq` means the whole value.
    brand: "enum",
    category: "enum",
    price: "number",
    inStock: "boolean",
  },
});
for (const product of PRODUCTS) {
  insert(database, product);
}

const catalogue = new MiniSearch<Product>({
  fields: ["name", "description"],
  storeFields: [
    "id",
    "name",
    "description",
    "brand",
    "category",
    "price",
    "inStock",
  ],
});
catalogue.addAll([...PRODUCTS]);

const oramaProducts: IndexDeclaration<ProductShape> = index({
  schema: ProductSchema,
  id: (product) => product.id,
  filterable: ["brand", "category", "price", "inStock"],
  facetable: ["brand", "category"],
  highlightable: [],
  sorts: ["relevance"],
  profiles: ["default"],
  adapter: orama({
    db: database,
    search,
    revision: () => REVISION,
    profiles: { default: { properties: ["name", "description"] } },
    sorts: { relevance: {} },
  }),
});

const minisearchProducts: IndexDeclaration<ProductShape> = index({
  schema: ProductSchema,
  id: (product) => product.id,
  filterable: ["brand", "category", "price", "inStock"],
  facetable: ["brand", "category"],
  highlightable: [],
  sorts: ["relevance"],
  profiles: ["default"],
  adapter: minisearch({
    index: catalogue,
    revision: () => REVISION,
    profiles: { default: { fields: ["name", "description"], prefix: true } },
    sorts: { relevance: "relevance" },
  }),
});

const fuseProducts: IndexDeclaration<ProductShape> = index({
  schema: ProductSchema,
  id: (product) => product.id,
  filterable: ["brand", "category", "price", "inStock"],
  facetable: ["brand", "category"],
  highlightable: [],
  sorts: ["relevance"],
  profiles: ["default"],
  adapter: fuse({
    index: new Fuse(PRODUCTS, {
      keys: ["name", "description"],
      threshold: 0.3,
      ignoreLocation: true,
      includeScore: true,
    }),
    revision: () => REVISION,
    profiles: { default: null },
    sorts: { relevance: null },
  }),
});

const scouts = {
  orama: new Scout({ indexes: { products: oramaProducts } }),
  minisearch: new Scout({ indexes: { products: minisearchProducts } }),
  fuse: new Scout({ indexes: { products: fuseProducts } }),
};

/**
 * The index handle for one engine. The adapter fingerprint is part of every
 * query key, so switching engines cannot serve the other engine's cached
 * answer.
 */
export const productIndex = (engine: Engine) =>
  scouts[engine].index("products");
