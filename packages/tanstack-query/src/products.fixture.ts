import { Scout, index } from "@priemskiyyy/scout";
import { createMockSearchAdapter } from "@priemskiyyy/scout/mock";
import type { SearchTotal, StandardSchema } from "@priemskiyyy/scout";

export type Product = {
  id: string;
  name: string;
  brand: string;
  price: number;
};

const isProduct = (value: unknown): value is Product => {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const record: Record<string, unknown> = { ...value };

  return (
    typeof record["id"] === "string" &&
    typeof record["name"] === "string" &&
    typeof record["brand"] === "string" &&
    typeof record["price"] === "number"
  );
};

// Hand written, so this package's tests depend on no validator.
const ProductSchema: StandardSchema<Product> = {
  "~standard": {
    version: 1,
    vendor: "scout-tanstack-query-test",
    validate: (value) => {
      if (isProduct(value)) {
        return { value };
      }

      return { issues: [{ message: "Not a product." }] };
    },
  },
};

type Answer = {
  documents: readonly unknown[];
  total: SearchTotal;
};

const EMPTY: Answer = {
  documents: [],
  total: { value: 0, accuracy: "exact", scope: "matches" },
};

/**
 * One index over a mock adapter that answers per page, so a test says what
 * each page holds and what the engine counted. The core derives every page's
 * neighbours from those two, and they are all the integration reacts to.
 */
export const products = (
  options: {
    answer?: (page: number) => Answer;
    /** Hold every answer, so a test can abort a search that is still running. */
    hold?: boolean;
    pageSize?: number;
    validate?: "error" | "skip";
  } = {},
) => {
  const mock = createMockSearchAdapter({
    hold: options.hold === true,
    response: (request) => {
      const page = options.answer?.(request.page.current) ?? EMPTY;

      return {
        hits: page.documents.map((document) => ({
          document,
          highlights: {},
          native: { score: 1 },
        })),
        total: page.total,
        facets: {
          brand: {
            values: [{ value: "Nike", count: page.documents.length }],
            exhaustive: true,
            native: null,
          },
        },
        took: null,
        native: { raw: true },
      };
    },
  });

  const declaration = index({
    schema: ProductSchema,
    id: (product) => product.id,
    searchable: ["name", "brand"],
    filterable: ["brand", "price"],
    facetable: { brand: "string" },
    highlightable: ["name"],
    sorts: { priceAsc: { price: "asc" } },
    validate: options.validate ?? "error",
  });

  const scout = new Scout({
    indexes: { products: declaration },
    adapters: { products: mock.adapter },
  });

  return {
    mock,
    scout,
    search: scout
      .index("products")
      .search("shoe")
      .page({ size: options.pageSize ?? 20 }),
  };
};
