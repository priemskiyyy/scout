import { expect, test } from "vitest";

import { getIndexNameFromSort } from "src/utils/getIndexNameFromSort";

const REPLICAS = { priceAsc: "products_price_asc" };

test("relevance reads the primary index", () => {
  expect(getIndexNameFromSort("products", REPLICAS, null)).toBe("products");
});

test("a sort reads its replica", () => {
  expect(
    getIndexNameFromSort("products", REPLICAS, {
      name: "priceAsc",
      by: [{ field: "price", direction: "asc" }],
    }),
  ).toBe("products_price_asc");
});

test("a sort with no replica is refused, naming where the replica goes", () => {
  expect(() =>
    getIndexNameFromSort("products", REPLICAS, {
      name: "newest",
      by: [{ field: "date", direction: "desc" }],
    }),
  ).toThrowError(
    expect.objectContaining({
      code: "configuration",
      message:
        "Algolia has no replica for the sort newest. Add one under replicas.newest.",
    }),
  );
});
