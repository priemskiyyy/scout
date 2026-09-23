import { expect, test } from "vitest";

import { getFieldValue } from "src/utils/getFieldValue";

test("a field is read from the document's own properties", () => {
  expect(getFieldValue({ price: 90 }, "price")).toBe(90);
  expect(getFieldValue({ price: 90 }, "title")).toBeUndefined();
});

test("an inherited property is not a field", () => {
  expect(getFieldValue({}, "toString")).toBeUndefined();
});

test("a value that is not an object has no fields", () => {
  expect(getFieldValue("shoe", "length")).toBeUndefined();
  expect(getFieldValue(null, "price")).toBeUndefined();
});
