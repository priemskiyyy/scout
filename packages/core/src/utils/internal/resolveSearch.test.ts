import { expect, test } from "vitest";

import type { FilterExpression } from "src/types/FilterExpression";
import { createTestScout } from "src/utils/internal/testScout.fixture";

test("a search reaches the adapter resolved against its index", async () => {
  const { mock, products } = createTestScout();

  await products
    .search("shoe")
    .where((fields, { and }) =>
      and(fields.inStock.eq(true), fields.price.lte(200)),
    )
    .sort("cheapestNamed")
    .profile("names")
    .facets("price", "brand", "price")
    .highlight("name")
    .page({ current: 2, size: 5 })
    .provider({ boost: 2 })
    .execute();

  expect(mock.requests[0]?.request).toEqual({
    index: "products",
    query: "shoe",
    searchable: ["name"],
    profile: "names",
    sort: {
      name: "cheapestNamed",
      by: [
        { field: "price", direction: "asc" },
        { field: "name", direction: "asc" },
      ],
    },
    filter: {
      type: "and",
      expressions: [
        { type: "comparison", field: "inStock", operator: "eq", value: true },
        { type: "comparison", field: "price", operator: "lte", value: 200 },
      ],
    },
    facets: ["brand", "price"],
    highlights: ["name"],
    page: { current: 2, size: 5 },
    provider: { boost: 2 },
  });
  expect(Object.isFrozen(mock.requests[0]?.request)).toBe(true);
});

test("by default a search is relevance ordered over the index's searchable fields", async () => {
  const { mock, products } = createTestScout();

  await products.search("shoe").execute();

  expect(mock.requests[0]?.request).toMatchObject({
    searchable: ["name", "brand"],
    profile: "default",
    sort: null,
    filter: null,
    page: { current: 1, size: 20 },
    provider: null,
  });
});

test("an empty query browses, reaching the adapter as it is", async () => {
  const { mock, products } = createTestScout();

  await products.search("").execute();

  expect(mock.requests[0]?.request.query).toBe("");
});

test("repeated where calls combine with and", async () => {
  const { mock, products } = createTestScout();

  await products
    .search("shoe")
    .where((fields) => fields.inStock.eq(true))
    .where((fields) => fields.brand.eq("Nike"))
    .execute();

  expect(mock.requests[0]?.request.filter).toEqual({
    type: "and",
    expressions: [
      { type: "comparison", field: "inStock", operator: "eq", value: true },
      { type: "comparison", field: "brand", operator: "eq", value: "Nike" },
    ],
  });
});

// Each refusal is something the compiler already catches. A JavaScript caller,
// or a name read from a URL, still reaches the runtime guard.
test.each([
  {
    what: "a query that is not a string",
    search: (products: ReturnType<typeof createTestScout>["products"]) =>
      // @ts-expect-error a query is a string
      products.search(null),
    message: 'The query for products must be a string. Pass "" to browse.',
  },
  {
    what: "an undeclared sort",
    search: (products: ReturnType<typeof createTestScout>["products"]) =>
      // @ts-expect-error newest is not a declared sort
      products.search("shoe").sort("newest"),
    message:
      'The index products has no sort named "newest". It declares relevance, priceAsc, cheapestNamed.',
  },
  {
    what: "an undeclared profile",
    search: (products: ReturnType<typeof createTestScout>["products"]) =>
      // @ts-expect-error titles is not a declared profile
      products.search("shoe").profile("titles"),
    message:
      'The index products has no profile named "titles". It declares default, names.',
  },
  {
    what: "an undeclared facet",
    search: (products: ReturnType<typeof createTestScout>["products"]) =>
      // @ts-expect-error tags is not facetable
      products.search("shoe").facets("tags"),
    message: "The index products does not declare tags as facetable.",
  },
  {
    what: "an undeclared highlight",
    search: (products: ReturnType<typeof createTestScout>["products"]) =>
      // @ts-expect-error brand is not highlightable
      products.search("shoe").highlight("brand"),
    message: "The index products does not declare brand as highlightable.",
  },
  {
    what: "a filter built by hand on an undeclared field",
    search: (products: ReturnType<typeof createTestScout>["products"]) =>
      products.search("shoe").where((): FilterExpression => ({
        type: "not",
        expression: {
          type: "comparison",
          field: "secret",
          operator: "eq",
          value: 1,
        },
      })),
    message: "The index products does not declare secret as filterable.",
  },
  {
    what: "a provider option with no canonical form",
    search: (products: ReturnType<typeof createTestScout>["products"]) =>
      products.search("shoe").provider({ at: () => 1 }),
    message: "provider.at",
  },
  {
    what: "a filter value with no canonical form",
    search: (products: ReturnType<typeof createTestScout>["products"]) =>
      products.search("shoe").where((fields) => fields.price.gt(Number.NaN)),
    message: "price",
  },
])("$what is refused before anything is sent", async ({ search, message }) => {
  const { mock, products } = createTestScout();

  await expect(search(products).execute()).rejects.toMatchObject({
    code: "configuration",
    message: expect.stringContaining(message),
  });
  expect(mock.requests).toHaveLength(0);
});

test("a provider option the adapter writes itself is refused before anything is sent", async () => {
  const { mock, products } = createTestScout({ reservedOptions: ["q"] });

  await expect(
    products.search("shoe").provider({ q: "boots" }).execute(),
  ).rejects.toMatchObject({
    code: "configuration",
    message: "provider.q is written by Scout from the search itself.",
  });
  await expect(
    products.search("shoe").provider({ boost: 2 }).execute(),
  ).resolves.toBeDefined();
  expect(mock.requests).toHaveLength(1);
});

// Half of execute throwing and half rejecting is how a caller ends up with an
// uncaught exception from an API that returns a promise.
test("execute never throws synchronously, whatever it refuses", () => {
  const { products } = createTestScout();

  const returned = products
    .search("shoe")
    .where((fields) => fields.price.gt(Number.NaN))
    .execute();

  expect(returned).toBeInstanceOf(Promise);
  returned.catch(() => undefined);
});
