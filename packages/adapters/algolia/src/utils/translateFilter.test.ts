import { UnsupportedSearchFeatureError } from "@priemskiyyy/scout";
import type { FilterExpression } from "@priemskiyyy/scout";
import { expect, test } from "vitest";
import { translateFilter } from "src/utils/translateFilter";

const a: FilterExpression = {
  type: "comparison",
  field: "brand",
  operator: "eq",
  value: "a",
};
const b: FilterExpression = {
  type: "comparison",
  field: "brand",
  operator: "eq",
  value: "b",
};

test("a doubly negated AND inside an OR is still unsupported", () => {
  expect(() =>
    translateFilter({
      type: "or",
      expressions: [
        a,
        {
          type: "not",
          expression: {
            type: "not",
            expression: { type: "and", expressions: [a, b] },
          },
        },
      ],
    }),
  ).toThrow(UnsupportedSearchFeatureError);
});

test("a mixed numeric and facet membership is refused", () => {
  expect(() =>
    translateFilter({
      type: "comparison",
      field: "value",
      operator: "in",
      value: [1, "one"],
    }),
  ).toThrow(UnsupportedSearchFeatureError);
});

test("membership inside an OR does not nest parentheses", () => {
  expect(
    translateFilter({
      type: "or",
      expressions: [
        a,
        {
          type: "comparison",
          field: "brand",
          operator: "in",
          value: ["b", "c"],
        },
      ],
    }),
  ).toBe('(brand:"a" OR brand:"b" OR brand:"c")');
});
