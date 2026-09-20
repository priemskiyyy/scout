import { Scout, index } from "@priemskiyyy/scout";
import { createMockSearchAdapter } from "@priemskiyyy/scout/mock";
import type { SearchPage, StandardSchema } from "@priemskiyyy/scout";

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
    validate: (value) =>
      isProduct(value)
        ? { value }
        : { issues: [{ message: "Not a product." }] },
  },
};

type Answer = {
  documents: readonly Product[];
  next: SearchPage["next"];
};

const emptyAnswer = (): Answer => ({ documents: [], next: null });

/**
 * One index over a mock adapter that answers per page, so a test says what each
 * page contains and what the engine claims about the next one. That is the only
 * input the TanStack integration reacts to.
 */
export const products = (
  options: {
    answer?: (page: number) => Answer;
    /** Hold every answer, so a test can abort a search that is still running. */
    hold?: boolean;
    pageSize?: number;
  } = {},
) => {
  const answer =
    typeof options.answer === "function" ? options.answer : emptyAnswer;
  const mock = createMockSearchAdapter({
    sorts: { relevance: null, priceAsc: null },
    profiles: { default: null },
    hold: options.hold === true,
    response: (request) => {
      const page = answer(request.page.current);
      return {
        hits: page.documents.map((document) => ({
          document,
          highlights: {},
          native: { score: 1 },
        })),
        page: {
          kind: "page",
          current: request.page.current,
          size: request.page.size,
          next: page.next,
          previous: request.page.current > 1 ? request.page.current - 1 : null,
        },
        total: {
          value: page.documents.length,
          accuracy: "exact",
          scope: "matches",
        },
        facets: {
          brand: {
            field: "brand",
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
    filterable: ["brand", "price"],
    facetable: ["brand"],
    highlightable: ["name"],
    sorts: ["relevance", "priceAsc"],
    profiles: ["default"],
    adapter: mock.adapter,
  });
  const scout = new Scout({ indexes: { products: declaration } });

  return {
    mock,
    scout,
    search: scout
      .index("products")
      .search("shoe")
      .pageSize(options.pageSize ?? 20),
  };
};
