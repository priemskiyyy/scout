import { expect, test } from "vitest";

import { createMockSearchAdapter } from "src/mock/createMockSearchAdapter";
import {
  createTestScout,
  productIndex,
} from "src/utils/internal/testScout.fixture";
import { Scout } from "src/utils/Scout";

test("two searches that mean the same thing share a key", () => {
  const { products } = createTestScout();

  const left = products
    .search("shoe")
    .where((fields) => fields.brand.in(["Bose", "Sony"]))
    .facets("brand", "price");

  const right = products
    .search("shoe")
    .where((fields) => fields.brand.in(["Sony", "Bose", "Sony"]))
    .facets("price", "brand");

  expect(left.key()).toEqual(right.key());
});

test("a key names the index first, so a cache can be cleared per index", () => {
  const { products } = createTestScout();

  expect(products.search("shoe").key().slice(0, 2)).toEqual([
    "scout",
    "products",
  ]);
});

test.each([
  ["the query", (search: Search) => search.query("boot")],
  ["the profile", (search: Search) => search.profile("names")],
  ["the sort", (search: Search) => search.sort("priceAsc")],
  [
    "the filter",
    (search: Search) => search.where((fields) => fields.brand.eq("Sony")),
  ],
  ["the facets", (search: Search) => search.facets("brand")],
  ["the highlights", (search: Search) => search.highlight("name")],
  ["the page", (search: Search) => search.page({ current: 2 })],
  ["the page size", (search: Search) => search.page({ size: 10 })],
  ["the provider options", (search: Search) => search.provider({ boost: 2 })],
])("%s is part of the identity", (_what, change) => {
  const { products } = createTestScout();
  const search = products.search("shoe");

  expect(change(search).key()).not.toEqual(search.key());
});

// A filter that matches nothing and one that restricts nothing both leave the
// adapter without a filter node, and must still never share an entry.
test("a contradiction and a tautology have different keys", () => {
  const { products } = createTestScout();

  expect(
    products
      .search("shoe")
      .where((fields) => fields.brand.in([]))
      .key(),
  ).not.toEqual(
    products
      .search("shoe")
      .where((fields) => fields.brand.notIn([]))
      .key(),
  );
});

test("the adapter's fingerprint is part of the identity", () => {
  const getKey = (fingerprint: string) =>
    new Scout({
      indexes: { products: productIndex },
      adapters: {
        products: createMockSearchAdapter({ fingerprint }).adapter,
      },
    })
      .index("products")
      .search("shoe")
      .key();

  expect(getKey("products@1")).not.toEqual(getKey("products@2"));
});

type Search = ReturnType<
  ReturnType<typeof createTestScout>["products"]["search"]
>;
