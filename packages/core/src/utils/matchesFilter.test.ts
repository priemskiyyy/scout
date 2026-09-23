import { expect, test } from "vitest";

import type { FilterExpression } from "src/types/FilterExpression";
import { matchesFilter } from "src/utils/matchesFilter";

const DOCUMENT = {
  brand: "Nike",
  price: 120,
  tags: ["sale", "new"],
  inStock: true,
};

test("no filter matches everything", () => {
  expect(matchesFilter(null, DOCUMENT)).toBe(true);
  expect(matchesFilter(null, null)).toBe(true);
});

test.each([
  [{ type: "comparison", field: "brand", operator: "eq", value: "Nike" }, true],
  [
    { type: "comparison", field: "brand", operator: "eq", value: "nike" },
    false,
  ],
  [
    { type: "comparison", field: "brand", operator: "neq", value: "Sony" },
    true,
  ],
  [
    { type: "comparison", field: "brand", operator: "neq", value: "Nike" },
    false,
  ],
  [
    {
      type: "comparison",
      field: "brand",
      operator: "in",
      value: ["Sony", "Nike"],
    },
    true,
  ],
  [
    { type: "comparison", field: "brand", operator: "in", value: ["Sony"] },
    false,
  ],
  [
    { type: "comparison", field: "brand", operator: "not-in", value: ["Sony"] },
    true,
  ],
  [
    { type: "comparison", field: "brand", operator: "not-in", value: ["Nike"] },
    false,
  ],
  [{ type: "comparison", field: "price", operator: "gt", value: 119 }, true],
  [{ type: "comparison", field: "price", operator: "gt", value: 120 }, false],
  [{ type: "comparison", field: "price", operator: "gte", value: 120 }, true],
  [{ type: "comparison", field: "price", operator: "lt", value: 121 }, true],
  [{ type: "comparison", field: "price", operator: "lt", value: 120 }, false],
  [{ type: "comparison", field: "price", operator: "lte", value: 120 }, true],
  [
    {
      type: "comparison",
      field: "price",
      operator: "between",
      value: [120, 130],
    },
    true,
  ],
  [
    {
      type: "comparison",
      field: "price",
      operator: "between",
      value: [100, 120],
    },
    true,
  ],
  [
    {
      type: "comparison",
      field: "price",
      operator: "between",
      value: [121, 130],
    },
    false,
  ],
  [{ type: "comparison", field: "inStock", operator: "eq", value: true }, true],
] satisfies [FilterExpression, boolean][])("%j is %s", (filter, expected) => {
  expect(matchesFilter(filter, DOCUMENT)).toBe(expected);
});

test("an array field matches when any of its elements does", () => {
  expect(
    matchesFilter(
      { type: "comparison", field: "tags", operator: "eq", value: "sale" },
      DOCUMENT,
    ),
  ).toBe(true);
  expect(
    matchesFilter(
      { type: "comparison", field: "tags", operator: "neq", value: "sale" },
      DOCUMENT,
    ),
  ).toBe(false);
  expect(
    matchesFilter(
      {
        type: "comparison",
        field: "tags",
        operator: "in",
        value: ["old", "new"],
      },
      DOCUMENT,
    ),
  ).toBe(true);
});

// A document's own field can hold anything, and only two numbers have an
// order, so a string price is never inside a range rather than coerced.
test("a document value of another type has no order", () => {
  expect(
    matchesFilter(
      { type: "comparison", field: "price", operator: "gt", value: 100 },
      { price: "120" },
    ),
  ).toBe(false);
  expect(
    matchesFilter(
      {
        type: "comparison",
        field: "price",
        operator: "lte",
        value: Number.NaN,
      },
      DOCUMENT,
    ),
  ).toBe(false);
});

test("a missing field equals nothing and differs from everything", () => {
  expect(
    matchesFilter(
      { type: "comparison", field: "colour", operator: "eq", value: "red" },
      DOCUMENT,
    ),
  ).toBe(false);
  expect(
    matchesFilter(
      { type: "comparison", field: "colour", operator: "neq", value: "red" },
      DOCUMENT,
    ),
  ).toBe(true);
  expect(
    matchesFilter(
      { type: "comparison", field: "colour", operator: "gt", value: 0 },
      DOCUMENT,
    ),
  ).toBe(false);
  expect(
    matchesFilter(
      { type: "comparison", field: "brand", operator: "eq", value: "Nike" },
      "Nike",
    ),
  ).toBe(false);
});

test("not, and and or compose", () => {
  const nike: FilterExpression = {
    type: "comparison",
    field: "brand",
    operator: "eq",
    value: "Nike",
  };

  const cheap: FilterExpression = {
    type: "comparison",
    field: "price",
    operator: "lt",
    value: 100,
  };

  expect(matchesFilter({ type: "not", expression: nike }, DOCUMENT)).toBe(
    false,
  );
  expect(
    matchesFilter({ type: "and", expressions: [nike, cheap] }, DOCUMENT),
  ).toBe(false);
  expect(
    matchesFilter({ type: "or", expressions: [nike, cheap] }, DOCUMENT),
  ).toBe(true);
});
