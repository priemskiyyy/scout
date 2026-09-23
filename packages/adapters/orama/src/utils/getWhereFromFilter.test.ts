import type { FilterExpression } from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import { createProductDatabase, searchProducts } from "src/orama.fixture";
import { getWhereFromFilter } from "src/utils/getWhereFromFilter";

const db = createProductDatabase();

// The real engine, so each translation is judged by what Orama finds with it.
const getIds = async (filter: FilterExpression) => {
  const response = await searchProducts(db, {
    where: getWhereFromFilter(db.schema, filter),
    limit: 100,
  });

  return response.hits.map((hit) => hit.id).sort();
};

test("an equality on an enum property matches the value and not its tokens", async () => {
  expect(
    getWhereFromFilter(db.schema, {
      type: "comparison",
      field: "brand",
      operator: "eq",
      value: "Acme Audio",
    }),
  ).toEqual({ brand: { eq: "Acme Audio" } });
  expect(
    await getIds({
      type: "comparison",
      field: "brand",
      operator: "eq",
      value: "Acme Audio",
    }),
  ).toEqual(["p1", "p2"]);
  expect(
    await getIds({
      type: "comparison",
      field: "brand",
      operator: "eq",
      value: "Acme",
    }),
  ).toEqual([]);
});

test("between bounds a number property at both ends", async () => {
  expect(
    getWhereFromFilter(db.schema, {
      type: "comparison",
      field: "price",
      operator: "between",
      value: [35, 99],
    }),
  ).toEqual({ price: { between: [35, 99] } });
  expect(
    await getIds({
      type: "comparison",
      field: "price",
      operator: "between",
      value: [35, 99],
    }),
  ).toEqual(["p2", "p4", "p6"]);
});

test("a range keeps only the documents inside it", async () => {
  expect(
    await getIds({
      type: "and",
      expressions: [
        { type: "comparison", field: "price", operator: "gte", value: 50 },
        { type: "comparison", field: "price", operator: "lte", value: 150 },
      ],
    }),
  ).toEqual(["p2", "p3"]);
});

test("a negated equality answers with the complement of the corpus", async () => {
  expect(
    await getIds({
      type: "comparison",
      field: "brand",
      operator: "neq",
      value: "Acme Audio",
    }),
  ).toEqual(["p3", "p4", "p5", "p6"]);
});

test("in becomes a union and notIn its complement", async () => {
  expect(
    await getIds({
      type: "comparison",
      field: "category",
      operator: "in",
      value: ["input", "kitchen"],
    }),
  ).toEqual(["p3", "p4", "p5", "p6"]);
  expect(
    await getIds({
      type: "comparison",
      field: "category",
      operator: "not-in",
      value: ["input", "kitchen"],
    }),
  ).toEqual(["p1", "p2"]);
});

test("a union of equalities covers every kind Orama matches by value", async () => {
  expect(
    await getIds({
      type: "comparison",
      field: "price",
      operator: "in",
      value: [15, 199],
    }),
  ).toEqual(["p1", "p5"]);
  expect(
    await getIds({
      type: "comparison",
      field: "inStock",
      operator: "in",
      value: [false],
    }),
  ).toEqual(["p2", "p5"]);
});

test("or and not nest inside and", async () => {
  expect(
    await getIds({
      type: "and",
      expressions: [
        {
          type: "or",
          expressions: [
            {
              type: "comparison",
              field: "category",
              operator: "eq",
              value: "input",
            },
            {
              type: "comparison",
              field: "category",
              operator: "eq",
              value: "kitchen",
            },
          ],
        },
        {
          type: "not",
          expression: {
            type: "comparison",
            field: "inStock",
            operator: "eq",
            value: false,
          },
        },
      ],
    }),
  ).toEqual(["p3", "p4", "p6"]);
});

test.each([
  [
    "a filter on a string property, which Orama matches by token",
    {
      type: "comparison",
      field: "name",
      operator: "eq",
      value: "Wireless Headphones",
    },
  ],
  [
    "an ordering of an enum property",
    { type: "comparison", field: "brand", operator: "gt", value: 1 },
  ],
  [
    "a between on an enum property",
    { type: "comparison", field: "brand", operator: "between", value: [1, 2] },
  ],
] satisfies [string, FilterExpression][])("%s is refused", (_what, filter) => {
  expect(() => getWhereFromFilter(db.schema, filter)).toThrowError(
    expect.objectContaining({ code: "unsupported-feature" }),
  );
});

test("a filter on a property the schema never declared is a configuration error", () => {
  expect(() =>
    getWhereFromFilter(db.schema, {
      type: "comparison",
      field: "colour",
      operator: "eq",
      value: "black",
    }),
  ).toThrowError(
    expect.objectContaining({
      code: "configuration",
      message: "The Orama schema does not declare colour.",
    }),
  );
});

test("a value the property cannot hold is a configuration error", () => {
  expect(() =>
    getWhereFromFilter(db.schema, {
      type: "comparison",
      field: "price",
      operator: "eq",
      value: "199",
    }),
  ).toThrowError(
    expect.objectContaining({
      code: "configuration",
      message: "Orama needs a number to apply eq to price.",
    }),
  );
  expect(() =>
    getWhereFromFilter(db.schema, {
      type: "comparison",
      field: "inStock",
      operator: "eq",
      value: "yes",
    }),
  ).toThrowError(expect.objectContaining({ code: "configuration" }));
});
