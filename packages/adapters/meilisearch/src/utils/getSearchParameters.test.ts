import type { AdapterSearchRequest } from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import type { MeilisearchSearchOptions } from "src/types/MeilisearchSearchOptions";
import { getSearchParameters } from "src/utils/getSearchParameters";

const MARKERS = { open: "[open]", close: "[close]" };

const getRequest = (
  overrides: Partial<AdapterSearchRequest<MeilisearchSearchOptions>> = {},
): AdapterSearchRequest<MeilisearchSearchOptions> => ({
  index: "products",
  query: "shoe",
  searchable: ["title", "brand"],
  profile: "default",
  sort: null,
  filter: null,
  facets: [],
  highlights: [],
  page: { current: 2, size: 5 },
  provider: null,
  ...overrides,
});

test("a plain search sends its fields and its page, and nothing else", () => {
  expect(getSearchParameters(getRequest(), undefined, "page", MARKERS)).toEqual(
    { page: 2, hitsPerPage: 5, attributesToSearchOn: ["title", "brand"] },
  );
});

test("the pagination mode decides how the page is asked for", () => {
  expect(
    getSearchParameters(getRequest(), undefined, "offset", MARKERS),
  ).toMatchObject({ offset: 5, limit: 5 });
});

test("a filter becomes the filter string", () => {
  expect(
    getSearchParameters(
      getRequest({
        filter: {
          type: "comparison",
          field: "brand",
          operator: "eq",
          value: "Apex",
        },
      }),
      undefined,
      "page",
      MARKERS,
    ).filter,
  ).toBe('brand = "Apex"');
});

test("a sort becomes the Meilisearch sort array", () => {
  expect(
    getSearchParameters(
      getRequest({
        sort: {
          name: "cheapestNamed",
          by: [
            { field: "price", direction: "asc" },
            { field: "title", direction: "desc" },
          ],
        },
      }),
      undefined,
      "page",
      MARKERS,
    ).sort,
  ).toEqual(["price:asc", "title:desc"]);
});

test("facets and highlights reach their parameters between the search's own markers", () => {
  const params = getSearchParameters(
    getRequest({ facets: ["brand"], highlights: ["title"] }),
    undefined,
    "page",
    MARKERS,
  );

  expect(params).toMatchObject({
    facets: ["brand"],
    attributesToHighlight: ["title"],
    highlightPreTag: "[open]",
    highlightPostTag: "[close]",
  });
  // _matchesPosition reports UTF-8 byte offsets, which the adapter never reads.
  expect(params).not.toHaveProperty("showMatchesPosition");
});

test("the profile's tuning comes first and provider options are merged over it", () => {
  expect(
    getSearchParameters(
      getRequest({
        provider: { matchingStrategy: "last", showRankingScore: true },
      }),
      { matchingStrategy: "all", rankingScoreThreshold: 0.2 },
      "page",
      MARKERS,
    ),
  ).toMatchObject({
    matchingStrategy: "last",
    rankingScoreThreshold: 0.2,
    showRankingScore: true,
  });
});
