import type { FilterComparison } from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import { getQueryFromFilter } from "src/utils/getQueryFromFilter";

const KEYWORDS = { brand: "brand.keyword" };

const acme: FilterComparison = {
  type: "comparison",
  field: "brand",
  operator: "eq",
  value: "Acme",
};

const cheap: FilterComparison = {
  type: "comparison",
  field: "price",
  operator: "lte",
  value: 200,
};

test("equality is a term on the exact field, with the value as it is", () => {
  const value = 'a"b\\c:d (e) OR f*';

  expect(getQueryFromFilter({ ...acme, value }, KEYWORDS)).toEqual({
    term: { "brand.keyword": { value } },
  });
});

test("a field keywords does not name is filtered as it is named", () => {
  expect(
    getQueryFromFilter(
      { type: "comparison", field: "inStock", operator: "eq", value: true },
      KEYWORDS,
    ),
  ).toEqual({ term: { inStock: { value: true } } });
});

test("inequality excludes the term", () => {
  expect(getQueryFromFilter({ ...acme, operator: "neq" }, KEYWORDS)).toEqual({
    bool: { must_not: [{ term: { "brand.keyword": { value: "Acme" } } }] },
  });
});

test("a set is a terms query, and its negation excludes it", () => {
  const set: FilterComparison = {
    type: "comparison",
    field: "brand",
    operator: "in",
    value: ["Acme", "Halden"],
  };

  expect(getQueryFromFilter(set, KEYWORDS)).toEqual({
    terms: { "brand.keyword": ["Acme", "Halden"] },
  });
  expect(getQueryFromFilter({ ...set, operator: "not-in" }, KEYWORDS)).toEqual({
    bool: { must_not: [{ terms: { "brand.keyword": ["Acme", "Halden"] } }] },
  });
});

test.each([
  ["gt", { gt: 200 }],
  ["gte", { gte: 200 }],
  ["lt", { lt: 200 }],
  ["lte", { lte: 200 }],
] satisfies [FilterComparison["operator"], object][])(
  "%s is the matching range bound",
  (operator, bound) => {
    expect(getQueryFromFilter({ ...cheap, operator }, KEYWORDS)).toEqual({
      range: { price: bound },
    });
  },
);

test("between is a range inclusive at both ends", () => {
  expect(
    getQueryFromFilter(
      {
        type: "comparison",
        field: "price",
        operator: "between",
        value: [100, 200],
      },
      KEYWORDS,
    ),
  ).toEqual({ range: { price: { gte: 100, lte: 200 } } });
});

test("and, or and not are bool groups, nested as the tree is", () => {
  expect(
    getQueryFromFilter(
      {
        type: "and",
        expressions: [
          cheap,
          {
            type: "or",
            expressions: [
              acme,
              { type: "not", expression: { ...acme, value: "Halden" } },
            ],
          },
        ],
      },
      KEYWORDS,
    ),
  ).toEqual({
    bool: {
      filter: [
        { range: { price: { lte: 200 } } },
        {
          bool: {
            should: [
              { term: { "brand.keyword": { value: "Acme" } } },
              {
                bool: {
                  must_not: [
                    { term: { "brand.keyword": { value: "Halden" } } },
                  ],
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      ],
    },
  });
});
