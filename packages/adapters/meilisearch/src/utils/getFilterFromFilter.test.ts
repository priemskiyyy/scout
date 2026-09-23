import type { FilterExpression, FilterValue } from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import { getFilterFromFilter } from "src/utils/getFilterFromFilter";

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

test("an equality filter becomes a quoted Meilisearch comparison", () => {
  expect(getFilterFromFilter(getEquality("brand", "eq", "Apex"))).toBe(
    'brand = "Apex"',
  );
});

test("a number or a boolean is written bare", () => {
  expect(getFilterFromFilter(getEquality("price", "eq", 120))).toBe(
    "price = 120",
  );
  expect(getFilterFromFilter(getEquality("inStock", "eq", true))).toBe(
    "inStock = true",
  );
});

test("a value carrying quotes and backslashes is escaped rather than refused", () => {
  const hostile = String.raw`Apex "Pro" \ 50% \\ end`;

  expect(getFilterFromFilter(getEquality("brand", "eq", hostile))).toBe(
    String.raw`brand = "Apex \"Pro\" \\ 50% \\\\ end"`,
  );
});

test("a value that tries to close the clause stays inside its quotes", () => {
  expect(
    getFilterFromFilter(getEquality("brand", "eq", 'Apex" OR price > 0 OR "')),
  ).toBe('brand = "Apex\\" OR price > 0 OR \\""');
});

test("a neq filter becomes the not equal operator", () => {
  expect(getFilterFromFilter(getEquality("brand", "neq", "Apex"))).toBe(
    'brand != "Apex"',
  );
});

test("set membership becomes IN and NOT IN with every value escaped", () => {
  expect(
    getFilterFromFilter(getSet("brand", "in", ["Apex", 'Ve"rtex', 7])),
  ).toBe('brand IN ["Apex", "Ve\\"rtex", 7]');
  expect(getFilterFromFilter(getSet("brand", "not-in", ["Apex"]))).toBe(
    'brand NOT IN ["Apex"]',
  );
});

test("ordering operators become symbols and a range becomes TO", () => {
  expect(getFilterFromFilter(getRange("price", "gt", 50))).toBe("price > 50");
  expect(getFilterFromFilter(getRange("price", "gte", 50))).toBe("price >= 50");
  expect(getFilterFromFilter(getRange("price", "lt", 120))).toBe("price < 120");
  expect(getFilterFromFilter(getRange("price", "lte", 120))).toBe(
    "price <= 120",
  );
  expect(
    getFilterFromFilter({
      type: "comparison",
      field: "price",
      operator: "between",
      value: [50, 120],
    }),
  ).toBe("price 50 TO 120");
});

test("boolean composition parenthesises every member it joins", () => {
  expect(
    getFilterFromFilter({
      type: "and",
      expressions: [
        getEquality("brand", "eq", "Apex"),
        {
          type: "or",
          expressions: [
            getRange("price", "lt", 100),
            { type: "not", expression: getEquality("price", "eq", 20) },
          ],
        },
      ],
    }),
  ).toBe('(brand = "Apex") AND ((price < 100) OR (NOT (price = 20)))');
});

// A field name is a string to the type, and one that is not an attribute
// would end it and start a new clause, so it is refused rather than escaped.
test("a field name that is not a Meilisearch attribute is refused", () => {
  expect(() =>
    getFilterFromFilter(getEquality('brand" OR "1', "eq", "Apex")),
  ).toThrowError(
    expect.objectContaining({
      code: "configuration",
      message:
        'Meilisearch cannot filter on "brand\\" OR \\"1": an attribute is letters, digits, underscores, dots and dashes.',
    }),
  );
});
