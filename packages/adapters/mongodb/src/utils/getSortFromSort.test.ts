import { expect, test } from "vitest";

import { getSortFromSort } from "src/utils/getSortFromSort";

test("each field sorts 1 ascending and -1 descending, in priority order", () => {
  const sort = getSortFromSort({
    name: "cheapestNewest",
    by: [
      { field: "price", direction: "asc" },
      { field: "released", direction: "desc" },
    ],
  });

  expect(sort).toEqual({ price: 1, released: -1 });
  expect(Object.keys(sort)).toEqual(["price", "released"]);
});
