import { expect, test } from "vitest";

import { createProductDatabase, searchProducts } from "src/orama.fixture";
import { getSortByFromSort } from "src/utils/getSortByFromSort";

const db = createProductDatabase();

test("a sort becomes Orama's sortBy, in its direction", async () => {
  const sortBy = getSortByFromSort(db.schema, {
    name: "priceDesc",
    by: [{ field: "price", direction: "desc" }],
  });

  const response = await searchProducts(db, { sortBy, limit: 100 });

  expect(sortBy).toEqual({ property: "price", order: "DESC" });
  expect(response.hits.map((hit) => hit.id)).toEqual([
    "p1",
    "p3",
    "p2",
    "p4",
    "p6",
    "p5",
  ]);
  expect(
    getSortByFromSort(db.schema, {
      name: "priceAsc",
      by: [{ field: "price", direction: "asc" }],
    }),
  ).toEqual({ property: "price", order: "ASC" });
});

test("a sort by more than one property is refused", () => {
  expect(() =>
    getSortByFromSort(db.schema, {
      name: "cheapestNamed",
      by: [
        { field: "price", direction: "asc" },
        { field: "name", direction: "asc" },
      ],
    }),
  ).toThrowError(
    expect.objectContaining({
      code: "unsupported-feature",
      message: "Orama orders by one property, and cheapestNamed orders by 2.",
    }),
  );
});

test("a sort on a property Orama keeps no sort index for is refused", () => {
  expect(() =>
    getSortByFromSort(db.schema, {
      name: "byBrand",
      by: [{ field: "brand", direction: "asc" }],
    }),
  ).toThrowError(expect.objectContaining({ code: "unsupported-feature" }));
});
