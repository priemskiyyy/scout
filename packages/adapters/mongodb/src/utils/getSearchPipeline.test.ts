import type { AdapterSearchRequest } from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import type { MongoSearchOptions } from "src/types/MongoSearchOptions";
import { getSearchPipeline } from "src/utils/getSearchPipeline";

const OPTIONS = {
  index: "default",
  tokens: ["brand", "category"],
  exactTotals: false,
};

const EVERYTHING = {
  compound: {
    should: [{ exists: { path: "name" } }, { exists: { path: "brand" } }],
    minimumShouldMatch: 1,
  },
};

const getRequest = (
  overrides: Partial<AdapterSearchRequest<MongoSearchOptions>> = {},
): AdapterSearchRequest<MongoSearchOptions> => ({
  index: "products",
  query: "shoe",
  searchable: ["name", "brand"],
  profile: "default",
  sort: null,
  filter: null,
  facets: [],
  highlights: [],
  page: { current: 1, size: 10 },
  provider: null,
  ...overrides,
});

const getStage = (
  overrides: Partial<AdapterSearchRequest<MongoSearchOptions>> = {},
  options: Partial<typeof OPTIONS> = {},
) => {
  const [first] = getSearchPipeline(getRequest(overrides), {
    ...OPTIONS,
    ...options,
  });

  if (first === undefined || !("$search" in first)) {
    throw new Error("The pipeline does not start with $search.");
  }

  return first.$search;
};

test("a query searches the profile's fields, pages with $skip and $limit, and adds the metadata to every row", () => {
  expect(
    getSearchPipeline(getRequest({ page: { current: 3, size: 20 } }), OPTIONS),
  ).toEqual([
    {
      $search: {
        index: "default",
        compound: {
          must: [{ text: { query: "shoe", path: ["name", "brand"] } }],
        },
        count: { type: "lowerBound" },
      },
    },
    { $skip: 40 },
    { $limit: 20 },
    {
      $set: {
        __scout: { meta: "$$SEARCH_META", score: { $meta: "searchScore" } },
      },
    },
  ]);
});

test("an empty query browses every document holding a field the search reads", () => {
  expect(getStage({ query: "" }).compound).toEqual({ must: [EVERYTHING] });
});

test("a filter is a clause that does not score, and a negation is a mustNot inside it", () => {
  expect(
    getStage({
      filter: {
        type: "comparison",
        field: "brand",
        operator: "neq",
        value: "Nimbus",
      },
    }).compound?.filter,
  ).toEqual([
    {
      compound: {
        mustNot: [{ equals: { path: "brand", value: "Nimbus" } }],
      },
    },
  ]);
});

test("exactTotals counts every match", () => {
  expect(getStage({}, { exactTotals: true }).count).toEqual({ type: "total" });
});

test("a sort is the stage's own sort", () => {
  expect(
    getStage({
      sort: { name: "priceAsc", by: [{ field: "price", direction: "asc" }] },
    }).sort,
  ).toEqual({ price: 1 });
});

test("highlights are asked for by field and read back onto every row", () => {
  const pipeline = getSearchPipeline(
    getRequest({ highlights: ["name"] }),
    OPTIONS,
  );

  expect(pipeline[0]).toMatchObject({
    $search: { highlight: { path: ["name"] } },
  });
  expect(pipeline[3]).toEqual({
    $set: {
      __scout: {
        meta: "$$SEARCH_META",
        score: { $meta: "searchScore" },
        highlights: { $meta: "searchHighlights" },
      },
    },
  });
});

test("facets move the operator into the facet collector", () => {
  const stage = getStage({ facets: ["brand", "category"] });

  expect(stage).not.toHaveProperty("compound");
  expect(stage.facet).toEqual({
    operator: {
      compound: {
        must: [{ text: { query: "shoe", path: ["name", "brand"] } }],
      },
    },
    facets: {
      brand: { type: "string", path: "brand" },
      category: { type: "string", path: "category" },
    },
  });
});

test("a facet on a field not indexed as token is refused", () => {
  expect(() => getStage({ facets: ["brand", "price"] })).toThrow(
    expect.objectContaining({ code: "unsupported-feature" }),
  );
});

test("provider options reach the stage beside what Scout writes", () => {
  expect(
    getStage({
      provider: { concurrent: true, tracking: { searchTerms: "shoe" } },
    }),
  ).toMatchObject({
    index: "default",
    concurrent: true,
    tracking: { searchTerms: "shoe" },
  });
});
