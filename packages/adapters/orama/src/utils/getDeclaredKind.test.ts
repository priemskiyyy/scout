import { expect, test } from "vitest";

import { getDeclaredKind } from "src/utils/getDeclaredKind";

const SCHEMA = { brand: "enum", meta: { rating: "number" } };

test("a property's kind is what the schema declares, addressed with dots when nested", () => {
  expect(getDeclaredKind(SCHEMA, "brand")).toBe("enum");
  expect(getDeclaredKind(SCHEMA, "meta.rating")).toBe("number");
});

test("a path the schema does not declare has no kind", () => {
  expect(getDeclaredKind(SCHEMA, "colour")).toBeNull();
  expect(getDeclaredKind(SCHEMA, "meta")).toBeNull();
  expect(getDeclaredKind(SCHEMA, "brand.name")).toBeNull();
});
