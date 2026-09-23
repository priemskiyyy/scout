import { createMockSearchAdapter } from "src/mock/createMockSearchAdapter";
import type { MockSearchAdapterOptions } from "src/mock/types/MockSearchAdapterOptions";
import type { MockSearchResponse } from "src/mock/types/MockSearchResponse";
import { index } from "src/utils/defineIndex";
import { ProductSchema } from "src/utils/internal/testSchema.fixture";
import { Scout } from "src/utils/Scout";

export const productIndex = index({
  schema: ProductSchema,
  id: (product) => product.id,
  searchable: ["name", "brand"],
  filterable: ["brand", "price", "inStock", "tags"],
  facetable: { brand: "string", price: "number", inStock: "boolean" },
  highlightable: ["name"],
  sorts: {
    priceAsc: { price: "asc" },
    cheapestNamed: { price: "asc", name: "asc" },
  },
  profiles: { names: { searchable: ["name"] } },
});

/** An answer holding these documents, counted exactly. */
export const getAnswer =
  (documents: readonly unknown[], extra: Partial<MockSearchResponse> = {}) =>
  (): MockSearchResponse => ({
    hits: documents.map((document) => ({
      document,
      highlights: {},
      native: { score: 1 },
    })),
    total: { value: documents.length, accuracy: "exact", scope: "matches" },
    facets: {},
    took: null,
    native: { raw: true },
    ...extra,
  });

/** A Scout over the product index, served by a mock the test controls. */
export const createTestScout = (options: MockSearchAdapterOptions = {}) => {
  const mock = createMockSearchAdapter(options);

  const scout = new Scout({
    indexes: { products: productIndex },
    adapters: { products: mock.adapter },
  });

  return { scout, mock, products: scout.index("products") };
};
