import type { FilterExpression, FilterValue } from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import { getFiltersFromFilter } from "src/utils/getFiltersFromFilter";

const getEquality = (
  field: string,
  operator: "eq" | "neq",
  value: FilterValue,
): FilterExpression => ({ type: "comparison", field, operator, value });

const getSet = (
  field: string,
  operator: "in" | "not-in",
  value: readonly FilterValue[],
): FilterExpression => ({ type: "comparison", field, operator, value });

const getRange = (
  field: string,
  operator: "gt" | "gte" | "lt" | "lte",
  value: number,
): FilterExpression => ({ type: "comparison", field, operator, value });

const getBetween = (
  field: string,
  min: number,
  max: number,
): FilterExpression => ({
  type: "comparison",
  field,
  operator: "between",
  value: [min, max],
});

const a = getEquality("brand", "eq", "a");
const b = getEquality("brand", "eq", "b");

test("a string equality is quoted so its content cannot become syntax", () => {
  expect(getFiltersFromFilter(getEquality("brand", "eq", "acme"))).toBe(
    'brand:"acme"',
  );
});

test("a hostile value keeps its quotes and backslashes as data", () => {
  expect(getFiltersFromFilter(getEquality("brand", "eq", 'Ac"me\\ & Co'))).toBe(
    'brand:"Ac\\"me\\\\ & Co"',
  );
});

test("a value that spells an operator is quoted rather than parsed", () => {
  expect(getFiltersFromFilter(getEquality("brand", "eq", "acme OR bolt"))).toBe(
    'brand:"acme OR bolt"',
  );
});

test("an attribute name that is not a bare identifier is quoted too", () => {
  expect(getFiltersFromFilter(getEquality("brand name", "eq", "acme"))).toBe(
    '"brand name":"acme"',
  );
});

test("a number compares numerically and a boolean reads as a facet", () => {
  expect(getFiltersFromFilter(getEquality("price", "eq", 79))).toBe(
    "price = 79",
  );
  expect(getFiltersFromFilter(getEquality("inStock", "eq", true))).toBe(
    "inStock:true",
  );
});

test("a negation uses NOT for text and the numeric operator for numbers", () => {
  expect(getFiltersFromFilter(getEquality("brand", "neq", "acme"))).toBe(
    'NOT brand:"acme"',
  );
  expect(getFiltersFromFilter(getEquality("price", "neq", 79))).toBe(
    "price != 79",
  );
});

test("a set becomes a disjunction and its negation a conjunction of negations", () => {
  expect(getFiltersFromFilter(getSet("brand", "in", ["acme", "bolt"]))).toBe(
    '(brand:"acme" OR brand:"bolt")',
  );
  expect(
    getFiltersFromFilter(getSet("brand", "not-in", ["acme", "bolt"])),
  ).toBe('NOT brand:"acme" AND NOT brand:"bolt"');
  expect(getFiltersFromFilter(getSet("price", "not-in", [1, 2]))).toBe(
    "price != 1 AND price != 2",
  );
});

test("comparisons and ranges use Algolia's numeric syntax", () => {
  expect(getFiltersFromFilter(getRange("price", "gt", 10))).toBe("price > 10");
  expect(getFiltersFromFilter(getRange("price", "gte", 10))).toBe(
    "price >= 10",
  );
  expect(getFiltersFromFilter(getRange("price", "lt", 10))).toBe("price < 10");
  expect(getFiltersFromFilter(getRange("price", "lte", 10))).toBe(
    "price <= 10",
  );
  expect(getFiltersFromFilter(getBetween("price", 10, 100))).toBe(
    "price:10 TO 100",
  );
});

test("only OR groups are parenthesised in Algolia's boolean grammar", () => {
  expect(
    getFiltersFromFilter({
      type: "and",
      expressions: [
        getEquality("brand", "eq", "acme"),
        {
          type: "or",
          expressions: [
            getRange("price", "lt", 50),
            getRange("price", "gt", 100),
          ],
        },
      ],
    }),
  ).toBe('brand:"acme" AND (price < 50 OR price > 100)');
});

test("a negated equality is written without group parentheses", () => {
  expect(
    getFiltersFromFilter({
      type: "not",
      expression: getEquality("brand", "eq", "acme"),
    }),
  ).toBe('NOT brand:"acme"');
});

test("a set inside an OR joins the group rather than nesting in it", () => {
  expect(
    getFiltersFromFilter({
      type: "or",
      expressions: [a, getSet("brand", "in", ["b", "c"])],
    }),
  ).toBe('(brand:"a" OR brand:"b" OR brand:"c")');
});

test.each([
  [
    "a negated group",
    { type: "not", expression: { type: "or", expressions: [a, b] } },
  ],
  [
    "an AND inside an OR",
    {
      type: "or",
      expressions: [
        a,
        {
          type: "and",
          expressions: [b, getRange("price", "gt", 10)],
        },
      ],
    },
  ],
  [
    "a doubly negated AND inside an OR",
    {
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
    },
  ],
  [
    "an OR mixing numeric and facet filters",
    { type: "or", expressions: [a, getEquality("price", "eq", 10)] },
  ],
  ["a negated range", { type: "not", expression: getBetween("price", 10, 20) }],
] satisfies [string, FilterExpression][])(
  "%s is refused, because Algolia's grammar cannot say it",
  (_what, filter) => {
    expect(() => getFiltersFromFilter(filter)).toThrowError(
      expect.objectContaining({ code: "unsupported-feature" }),
    );
  },
);

test("a set mixing numbers and facet values is refused", () => {
  expect(() =>
    getFiltersFromFilter(getSet("value", "in", [1, "one"])),
  ).toThrowError(
    expect.objectContaining({
      code: "unsupported-feature",
      message: "Algolia cannot mix numeric and facet values in one set filter.",
    }),
  );
});
