import { expect, test } from "vitest";

import { getExactFieldFromKeywords } from "src/utils/getExactFieldFromKeywords";

test("a field keywords names reads its exact field", () => {
  expect(getExactFieldFromKeywords("brand", { brand: "brand.keyword" })).toBe(
    "brand.keyword",
  );
});

test("a field keywords does not name is used as it is named", () => {
  expect(getExactFieldFromKeywords("price", { brand: "brand.keyword" })).toBe(
    "price",
  );
});

test("a field named like an Object method is not read from the prototype", () => {
  expect(getExactFieldFromKeywords("constructor", {})).toBe("constructor");
  expect(getExactFieldFromKeywords("toString", {})).toBe("toString");
});
