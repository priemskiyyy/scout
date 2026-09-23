import type { AdapterSort } from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import { getSortByFromSort } from "src/utils/getSortByFromSort";

test("a sort becomes its fields and directions, in priority order", () => {
  expect(
    getSortByFromSort({
      name: "cheapestNamed",
      by: [
        { field: "price", direction: "asc" },
        { field: "name", direction: "desc" },
      ],
    }),
  ).toBe("price:asc,name:desc");
});

test("a sort on more fields than Typesense orders by is refused", () => {
  const sort: AdapterSort = {
    name: "everything",
    by: [
      { field: "a", direction: "asc" },
      { field: "b", direction: "asc" },
      { field: "c", direction: "asc" },
      { field: "d", direction: "asc" },
    ],
  };

  expect(() => getSortByFromSort(sort)).toThrowError(
    expect.objectContaining({
      code: "unsupported-feature",
      message:
        "Typesense sorts by at most 3 fields, and everything orders by 4.",
    }),
  );
});
