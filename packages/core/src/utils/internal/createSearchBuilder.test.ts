import { expect, test } from "vitest";

import { createTestScout } from "src/utils/internal/testScout.fixture";

test("the builder is immutable, so a stored search never changes", async () => {
  const { mock, products } = createTestScout();
  const base = products.search("shoe").page({ size: 10 });
  const narrowed = base.where((fields) => fields.brand.eq("Nike"));

  await base.execute();
  await narrowed.execute();

  expect(mock.requests[0]?.request.filter).toBeNull();
  expect(mock.requests[1]?.request.filter).toEqual({
    type: "comparison",
    field: "brand",
    operator: "eq",
    value: "Nike",
  });
});

test("mutating caller-owned provider options cannot change a stored search", async () => {
  const { mock, products } = createTestScout();
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
  const { mock, products } = createTestScout();
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

test("a page call keeps what it leaves out", async () => {
  const { mock, products } = createTestScout();

  await products
    .search("shoe")
    .page({ size: 5 })
    .page({ current: 3 })
    .execute();

  expect(mock.requests[0]?.request.page).toEqual({ current: 3, size: 5 });
});

// Scout pages are one-based, so these are programming mistakes. Unchecked, an
// adapter over a zero-based engine turns page 0 into page -1.
test("a page or page size that cannot mean anything is refused at the call site", () => {
  const { products } = createTestScout();
  const search = products.search("shoe");

  for (const value of [0, -1, 1.5, Number.NaN]) {
    expect(() => search.page({ current: value })).toThrowError(
      expect.objectContaining({ code: "configuration" }),
    );
    expect(() => search.page({ size: value })).toThrowError(
      expect.objectContaining({ code: "configuration" }),
    );
  }
});

// Every engine answers a reversed range with nothing and no error, so the
// mistake reads as "nothing matched" and nothing says why.
test("a between with its bounds the wrong way round is refused", () => {
  const { products } = createTestScout();
  const search = products.search("shoe");

  expect(() =>
    search.where((fields) => fields.price.between(300, 50)),
  ).toThrowError(expect.objectContaining({ code: "configuration" }));
  expect(() =>
    search.where((fields) => fields.price.between(50, 300)),
  ).not.toThrow();
});
