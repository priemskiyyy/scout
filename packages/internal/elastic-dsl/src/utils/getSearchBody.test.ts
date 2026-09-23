import type { AdapterSearchRequest } from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import type { ElasticSearchOptions } from "src/types/ElasticSearchOptions";
import { getSearchBody } from "src/utils/getSearchBody";

const MARKERS = { open: "[open]", close: "[close]" };
const SETTINGS = { keywords: { brand: "brand.keyword" } };

const getRequest = (
  overrides: Partial<AdapterSearchRequest<ElasticSearchOptions>> = {},
): AdapterSearchRequest<ElasticSearchOptions> => ({
  index: "products",
  query: "shoe",
  searchable: ["name", "brand"],
  profile: "default",
  sort: null,
  filter: null,
  facets: [],
  highlights: [],
  page: { current: 3, size: 5 },
  provider: null,
  ...overrides,
});

test("a plain search sends the query over its fields and its page, and nothing else", () => {
  expect(getSearchBody(getRequest(), SETTINGS, MARKERS)).toEqual({
    query: {
      bool: {
        must: [{ multi_match: { query: "shoe", fields: ["name", "brand"] } }],
      },
    },
    from: 10,
    size: 5,
  });
});

test("an empty query browses every document", () => {
  expect(
    getSearchBody(getRequest({ query: "" }), SETTINGS, MARKERS).query,
  ).toEqual({ bool: { must: [{ match_all: {} }] } });
});

test("the filter narrows the documents the aggregations count too", () => {
  const body = getSearchBody(
    getRequest({
      filter: {
        type: "comparison",
        field: "brand",
        operator: "eq",
        value: "Acme",
      },
    }),
    SETTINGS,
    MARKERS,
  );

  expect(body.query).toEqual({
    bool: {
      must: [{ multi_match: { query: "shoe", fields: ["name", "brand"] } }],
      filter: [{ term: { "brand.keyword": { value: "Acme" } } }],
    },
  });
  expect(body).not.toHaveProperty("post_filter");
});

test("a sort orders by each exact field in turn", () => {
  expect(
    getSearchBody(
      getRequest({
        sort: {
          name: "brandThenPrice",
          by: [
            { field: "brand", direction: "asc" },
            { field: "price", direction: "desc" },
          ],
        },
      }),
      SETTINGS,
      MARKERS,
    ).sort,
  ).toEqual([
    { "brand.keyword": { order: "asc" } },
    { price: { order: "desc" } },
  ]);
});

test("each facet is a terms aggregation named for its field, over its exact field", () => {
  expect(
    getSearchBody(getRequest({ facets: ["brand", "price"] }), SETTINGS, MARKERS)
      .aggs,
  ).toEqual({
    brand: { terms: { field: "brand.keyword" } },
    price: { terms: { field: "price" } },
  });
});

test("highlights ask for whole values between this search's markers", () => {
  expect(
    getSearchBody(getRequest({ highlights: ["name"] }), SETTINGS, MARKERS)
      .highlight,
  ).toEqual({
    pre_tags: ["[open]"],
    post_tags: ["[close]"],
    fields: { name: { number_of_fragments: 0 } },
  });
});

test("the total is tracked exactly only when asked for, and never switched off", () => {
  expect(
    getSearchBody(getRequest(), { trackTotalHits: true }, MARKERS)
      .track_total_hits,
  ).toBe(true);
  expect(
    getSearchBody(getRequest(), { trackTotalHits: false }, MARKERS),
  ).not.toHaveProperty("track_total_hits");
  expect(getSearchBody(getRequest(), {}, MARKERS)).not.toHaveProperty(
    "track_total_hits",
  );
});

test("provider options reach the body beside what Scout writes", () => {
  expect(
    getSearchBody(
      getRequest({ provider: { min_score: 1.5, timeout: "2s" } }),
      SETTINGS,
      MARKERS,
    ),
  ).toMatchObject({ min_score: 1.5, timeout: "2s", from: 10, size: 5 });
});
