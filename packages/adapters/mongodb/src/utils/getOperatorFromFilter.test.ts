import type { FilterExpression } from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import { getOperatorFromFilter } from "src/utils/getOperatorFromFilter";

const TOKENS = ["brand", "tags"];

const nimbus: FilterExpression = {
  type: "comparison",
  field: "brand",
  operator: "eq",
  value: "Nimbus",
};

const cheap: FilterExpression = {
  type: "comparison",
  field: "price",
  operator: "lt",
  value: 20,
};

const translate = (expression: FilterExpression) =>
  getOperatorFromFilter(expression, TOKENS);

test("an equality on a token field is an exact equals", () => {
  expect(translate(nimbus)).toEqual({
    equals: { path: "brand", value: "Nimbus" },
  });
});

test("a value is data, so quotes, backslashes and colons reach MongoDB as they are", () => {
  expect(translate({ ...nimbus, value: 'a"b\\c:d' })).toEqual({
    equals: { path: "brand", value: 'a"b\\c:d' },
  });
});

test("a number or a boolean compares on any field", () => {
  expect(
    translate({
      type: "comparison",
      field: "inStock",
      operator: "eq",
      value: true,
    }),
  ).toEqual({ equals: { path: "inStock", value: true } });
  expect(
    translate({
      type: "comparison",
      field: "price",
      operator: "in",
      value: [1, 2],
    }),
  ).toEqual({ in: { path: "price", value: [1, 2] } });
});

test("a negation is a compound of mustNot alone, which matches every other document", () => {
  expect(translate({ ...nimbus, operator: "neq" })).toEqual({
    compound: {
      mustNot: [{ equals: { path: "brand", value: "Nimbus" } }],
    },
  });
  expect(translate({ type: "not", expression: cheap })).toEqual({
    compound: {
      mustNot: [{ range: { path: "price", lt: 20 } }],
    },
  });
});

test("a set is one in, and its negation subtracts it", () => {
  const set: FilterExpression = {
    type: "comparison",
    field: "tags",
    operator: "in",
    value: ["shoe", "sport"],
  };

  expect(translate(set)).toEqual({
    in: { path: "tags", value: ["shoe", "sport"] },
  });
  expect(translate({ ...set, operator: "not-in" })).toEqual({
    compound: {
      mustNot: [{ in: { path: "tags", value: ["shoe", "sport"] } }],
    },
  });
});

test.each([
  ["gt", 10, { gt: 10 }],
  ["gte", 10, { gte: 10 }],
  ["lt", 10, { lt: 10 }],
  ["lte", 10, { lte: 10 }],
] satisfies ["gt" | "gte" | "lt" | "lte", number, object][])(
  "%s is a range",
  (operator, value, bounds) => {
    expect(
      translate({ type: "comparison", field: "price", operator, value }),
    ).toEqual({ range: { path: "price", ...bounds } });
  },
);

test("between is a range inclusive at both ends", () => {
  expect(
    translate({
      type: "comparison",
      field: "price",
      operator: "between",
      value: [100, 200],
    }),
  ).toEqual({ range: { path: "price", gte: 100, lte: 200 } });
});

test("an and requires every member without scoring it", () => {
  expect(translate({ type: "and", expressions: [nimbus, cheap] })).toEqual({
    compound: {
      filter: [
        { equals: { path: "brand", value: "Nimbus" } },
        { range: { path: "price", lt: 20 } },
      ],
    },
  });
});

test("an or requires one member wherever it is nested", () => {
  expect(translate({ type: "or", expressions: [nimbus, cheap] })).toEqual({
    compound: {
      should: [
        { equals: { path: "brand", value: "Nimbus" } },
        { range: { path: "price", lt: 20 } },
      ],
      minimumShouldMatch: 1,
    },
  });
});

test.each([
  [
    "an equality on a string field not indexed as token",
    { ...nimbus, field: "name" },
  ],
  [
    "a negated equality on a string field not indexed as token",
    { ...nimbus, field: "name", operator: "neq" },
  ],
  [
    "a set of strings on a field not indexed as token",
    { type: "comparison", field: "name", operator: "in", value: ["a", "b"] },
  ],
  [
    "a set mixing value types",
    { type: "comparison", field: "tags", operator: "in", value: ["a", 1] },
  ],
] satisfies [string, FilterExpression][])(
  "%s is refused",
  (_what, expression) => {
    expect(() => translate(expression)).toThrow(
      expect.objectContaining({ code: "unsupported-feature" }),
    );
  },
);
