import { expect, test, vi } from "vitest";
import { createMockSearchAdapter } from "src/mock/createMockSearchAdapter";
import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import type { MockSearchAdapterOptions } from "src/mock/types/MockSearchAdapterOptions";
import type { MockSearchResponse } from "src/mock/types/MockSearchResponse";
import { Scout } from "src/utils/Scout";
import { index } from "src/utils/defineIndex";
import { ProductSchema, product } from "src/utils/internal/testSchema.fixture";
import type { Product } from "src/utils/internal/testSchema.fixture";

const answerWith = (
  documents: readonly unknown[],
  extra: Partial<MockSearchResponse> = {},
) => ({
  response: (request: AdapterSearchRequest<unknown>): MockSearchResponse => ({
    hits: documents.map((document) => ({
      document,
      highlights: {},
      native: { score: 1 },
    })),
    page: {
      kind: "page",
      current: request.page.current,
      size: request.page.size,
      next: null,
      previous: null,
    },
    total: { value: documents.length, accuracy: "exact", scope: "matches" },
    facets: {},
    took: null,
    native: { raw: true },
    ...extra,
  }),
});

const NAMES = {
  sorts: { relevance: null, priceAsc: null },
  profiles: { default: null },
} as const;

type BuildOptions = Omit<
  MockSearchAdapterOptions<"relevance" | "priceAsc", "default">,
  "sorts" | "profiles"
>;

// The declared names are spread first so their literal types survive whatever
// a test overrides.
const build = (options: BuildOptions = {}) => {
  const mock = createMockSearchAdapter({ ...NAMES, ...options });
  const sorts: ["relevance" | "priceAsc", ...("relevance" | "priceAsc")[]] = [
    "relevance",
    "priceAsc",
  ];
  const definition = {
    schema: ProductSchema,
    id: (item: Product) => item.id,
    filterable: ["brand", "price", "inStock", "tags"] as const,
    facetable: ["brand"] as const,
    highlightable: ["name"] as const,
    sorts,
    profiles: ["default"] as const,
    adapter: mock.adapter,
  };
  const products = index(definition);
  const scout = new Scout({ indexes: { products } });
  return {
    scout,
    mock,
    definition,
    declaration: products,
    products: scout.index("products"),
  };
};

test("an index keeps the adapter captured at declaration for search and disposal", async () => {
  const original = build();
  const replacement = build();
  const disposeOriginal = vi.spyOn(original.mock.adapter, "dispose");
  const disposeReplacement = vi.spyOn(replacement.mock.adapter, "dispose");
  original.definition.adapter = replacement.mock.adapter;

  const products = original.scout.index("products");
  await products.search("shoe").execute();
  original.scout.dispose();

  expect(products.native).toBe(original.mock.adapter.native);
  expect(original.mock.requests).toHaveLength(1);
  expect(replacement.mock.requests).toHaveLength(0);
  expect(disposeOriginal).toHaveBeenCalledExactlyOnceWith();
  expect(disposeReplacement).not.toHaveBeenCalled();
});

test("an index declaration refuses adapter replacement", () => {
  const original = build();
  const replacement = build();

  expect(() =>
    Object.assign(original.declaration, { adapter: replacement.mock.adapter }),
  ).toThrowError(TypeError);
  expect(original.declaration.adapter).toBe(original.mock.adapter);
});

test("later handles keep the schema and identity captured at declaration", async () => {
  const document = product({ id: "original" });
  const { definition, scout } = build(answerWith([document]));
  definition.schema = {
    "~standard": {
      ...ProductSchema["~standard"],
      validate: () => ({ value: product({ name: "Replacement" }) }),
    },
  };
  definition.id = () => "replacement";

  const result = await scout.index("products").search("shoe").execute();

  expect(result.hits[0]).toMatchObject({ id: "original", document });
});

test("reordering caller-owned sorts cannot change an index's default", async () => {
  const { definition, scout, mock } = build();
  definition.sorts.reverse();

  await scout.index("products").search("shoe").execute();

  expect(mock.requests[0]?.request.sort).toBe("relevance");
});

test("a search reaches the adapter with a normalised request", async () => {
  const { mock, products } = build(answerWith([product()]));

  await products
    .search("shoe")
    .where((p, { and }) => and(p.inStock.eq(true), p.price.lte(200)))
    .sort("priceAsc")
    .execute();

  expect(mock.requests[0]?.request.filter).toEqual({
    type: "and",
    expressions: [
      { type: "comparison", field: "inStock", operator: "eq", value: true },
      { type: "comparison", field: "price", operator: "lte", value: 200 },
    ],
  });
  expect(mock.requests[0]?.request.sort).toBe("priceAsc");
  expect(mock.requests[0]?.request.page.current).toBe(1);
});

test("repeated where calls combine with and", async () => {
  const { mock, products } = build(answerWith([]));

  await products
    .search("shoe")
    .where((p) => p.inStock.eq(true))
    .where((p) => p.brand.eq("Nike"))
    .execute();

  expect(mock.requests[0]?.request.filter).toMatchObject({ type: "and" });
});

test("the builder is immutable, so a stored search is never changed by a later one", async () => {
  const { mock, products } = build(answerWith([]));
  const base = products.search("shoe").pageSize(10);
  const narrowed = base.where((p) => p.brand.eq("Nike"));

  await base.execute();
  await narrowed.execute();

  expect(mock.requests[0]?.request.filter).toEqual({
    type: "constant",
    value: true,
  });
  expect(mock.requests[1]?.request.filter).toMatchObject({
    type: "comparison",
    field: "brand",
  });
});

test("mutating caller-owned provider options cannot change a stored search", async () => {
  const { mock, products } = build();
  const options = { ranking: { fields: ["name"] } };
  const search = products.search("shoe").provider(options);
  const key = search.key();
  options.ranking.fields.push("price");

  expect(search.key()).toEqual(key);
  await search.execute();
  expect(mock.requests[0]?.request.provider).toEqual({
    ranking: { fields: ["name"] },
  });
});

test("mutating a filter operand cannot change a stored search", async () => {
  const { mock, products } = build();
  const brands = ["Nike"];
  const search = products
    .search("shoe")
    .where((fields) => fields.brand.in(brands));
  const key = search.key();
  brands.push("Adidas");

  expect(search.key()).toEqual(key);
  await search.execute();
  expect(mock.requests[0]?.request.filter).toMatchObject({ value: ["Nike"] });
});
