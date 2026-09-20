import { expect, test } from "vitest";
import type { IndexShape } from "src/types/IndexShape";
import { createFilterFields } from "src/utils/internal/createFilterFields";

test("prototype-named filter fields are ordinary own properties", () => {
  const fields = createFilterFields<
    IndexShape & {
      document: { __proto__: string; constructor: string };
      filterable: "__proto__" | "constructor";
    }
  >(["__proto__", "constructor"]);

  expect(Object.hasOwn(fields, "__proto__")).toBe(true);
  expect(Object.getPrototypeOf(fields)).toBe(Object.prototype);
  expect(fields.__proto__.eq("shoe")).toEqual({
    type: "comparison",
    field: "__proto__",
    operator: "eq",
    value: "shoe",
  });
  expect(fields.constructor.eq("shoe")).toEqual({
    type: "comparison",
    field: "constructor",
    operator: "eq",
    value: "shoe",
  });
});
