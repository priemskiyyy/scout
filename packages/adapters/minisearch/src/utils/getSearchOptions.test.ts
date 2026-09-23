import type {
  AdapterSearchRequest,
  FilterExpression,
} from "@priemskiyyy/scout";
import MiniSearch from "minisearch";
import { expect, test } from "vitest";

import { createProductIndex } from "src/minisearch.fixture";
import type { MiniSearchProfile } from "src/types/MiniSearchProfile";
import { getSearchOptions } from "src/utils/getSearchOptions";

const getRequest = (
  overrides: Partial<AdapterSearchRequest<MiniSearchProfile>> = {},
): AdapterSearchRequest<MiniSearchProfile> => ({
  index: "products",
  query: "shoe",
  searchable: ["title", "category", "tags"],
  profile: "default",
  sort: null,
  filter: null,
  facets: [],
  highlights: [],
  page: { current: 1, size: 10 },
  provider: null,
  ...overrides,
});

/** The ids the real engine answers with, over every document. */
const getIds = (filter: FilterExpression) =>
  createProductIndex()
    .search(
      MiniSearch.wildcard,
      getSearchOptions(getRequest({ filter }), undefined, undefined),
    )
    .map((result) => result.id)
    .sort();

test("a search reads the profile's fields and no filter unless it has one", () => {
  expect(getSearchOptions(getRequest(), undefined, undefined)).toEqual({
    fields: ["title", "category", "tags"],
  });
});

test("the profile's fields are the only fields searched", () => {
  const products = createProductIndex();

  const everywhere = getSearchOptions(getRequest(), undefined, undefined);

  const titles = getSearchOptions(
    getRequest({ searchable: ["title"] }),
    undefined,
    undefined,
  );

  expect(products.search("footwear", everywhere)).toHaveLength(3);
  expect(products.search("footwear", titles)).toEqual([]);
});

test("the profile's tuning is applied, and provider options override it", () => {
  const products = createProductIndex();

  const prefixed = getSearchOptions(getRequest(), { prefix: true }, undefined);

  const overridden = getSearchOptions(
    getRequest({ provider: { prefix: false } }),
    { prefix: true },
    undefined,
  );

  expect(prefixed).toMatchObject({ prefix: true });
  expect(products.search("sho", prefixed)).toHaveLength(5);
  expect(products.search("sho", overridden)).toEqual([]);
});

test.each([
  [
    {
      type: "comparison",
      field: "category",
      operator: "eq",
      value: "footwear",
    },
    ["p1", "p2", "p3"],
  ],
  [
    {
      type: "comparison",
      field: "category",
      operator: "neq",
      value: "footwear",
    },
    ["p4", "p5", "p6"],
  ],
  [
    {
      type: "comparison",
      field: "category",
      operator: "in",
      value: ["care", "storage"],
    },
    ["p4", "p5"],
  ],
  [
    {
      type: "comparison",
      field: "category",
      operator: "not-in",
      value: ["footwear", "care"],
    },
    ["p5", "p6"],
  ],
  [{ type: "comparison", field: "price", operator: "gt", value: 140 }, ["p3"]],
  [
    { type: "comparison", field: "price", operator: "gte", value: 140 },
    ["p2", "p3"],
  ],
  [{ type: "comparison", field: "price", operator: "lt", value: 12 }, ["p4"]],
  [
    { type: "comparison", field: "price", operator: "lte", value: 12 },
    ["p4", "p6"],
  ],
  [
    {
      type: "comparison",
      field: "price",
      operator: "between",
      value: [12, 90],
    },
    ["p1", "p5", "p6"],
  ],
  [
    { type: "comparison", field: "tags", operator: "eq", value: "formal" },
    ["p3", "p4"],
  ],
] satisfies [FilterExpression, string[]][])(
  "%j keeps exactly the documents it matches",
  (filter, ids) => {
    expect(getIds(filter)).toEqual(ids);
  },
);

test("filters compose with and, or and not", () => {
  const footwear: FilterExpression = {
    type: "comparison",
    field: "category",
    operator: "eq",
    value: "footwear",
  };

  const cheap: FilterExpression = {
    type: "comparison",
    field: "price",
    operator: "lt",
    value: 100,
  };

  expect(getIds({ type: "and", expressions: [footwear, cheap] })).toEqual([
    "p1",
  ]);
  expect(getIds({ type: "or", expressions: [footwear, cheap] })).toEqual([
    "p1",
    "p2",
    "p3",
    "p4",
    "p5",
    "p6",
  ]);
  expect(
    getIds({
      type: "not",
      expression: { type: "or", expressions: [footwear, cheap] },
    }),
  ).toEqual([]);
});
