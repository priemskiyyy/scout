import type { AdapterSearchRequest } from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import type { AlgoliaSearchOptions } from "src/types/AlgoliaSearchOptions";
import { getSearchParameters } from "src/utils/getSearchParameters";

const MARKERS = { open: "[open]", close: "[close]" };

const getRequest = (
  overrides: Partial<AdapterSearchRequest<AlgoliaSearchOptions>> = {},
): AdapterSearchRequest<AlgoliaSearchOptions> => ({
  index: "products",
  query: "running",
  searchable: ["title", "brand"],
  profile: "default",
  sort: null,
  filter: null,
  facets: [],
  highlights: [],
  page: { current: 1, size: 10 },
  provider: null,
  ...overrides,
});

test("a plain search sends its query, page and fields, and nothing else", () => {
  expect(getSearchParameters(getRequest(), undefined, MARKERS)).toEqual({
    query: "running",
    page: 0,
    hitsPerPage: 10,
    restrictSearchableAttributes: ["title", "brand"],
  });
});

test("Scout's page one is Algolia's page zero", () => {
  expect(
    getSearchParameters(
      getRequest({ page: { current: 2, size: 2 } }),
      undefined,
      MARKERS,
    ),
  ).toMatchObject({ page: 1, hitsPerPage: 2 });
});

test("a filter and facets reach their parameters, and only when asked for", () => {
  const parameters = getSearchParameters(
    getRequest({
      filter: {
        type: "comparison",
        field: "brand",
        operator: "eq",
        value: "acme",
      },
      facets: ["brand"],
    }),
    undefined,
    MARKERS,
  );

  expect(parameters).toMatchObject({
    filters: 'brand:"acme"',
    facets: ["brand"],
  });
  expect(
    getSearchParameters(getRequest(), undefined, MARKERS),
  ).not.toHaveProperty("filters");
});

test("highlights ask for their fields between the search's own markers", () => {
  expect(
    getSearchParameters(
      getRequest({ highlights: ["title"] }),
      undefined,
      MARKERS,
    ),
  ).toMatchObject({
    attributesToHighlight: ["title"],
    highlightPreTag: "[open]",
    highlightPostTag: "[close]",
  });
});

test("nothing is highlighted when nothing was asked for", () => {
  const parameters = getSearchParameters(getRequest(), undefined, MARKERS);

  expect(parameters).not.toHaveProperty("attributesToHighlight");
  expect(parameters).not.toHaveProperty("highlightPreTag");
});

test("the profile's parameters come first, then provider options, then Scout's", () => {
  expect(
    getSearchParameters(
      getRequest({ provider: { distinct: true } }),
      { typoTolerance: false, distinct: false },
      MARKERS,
    ),
  ).toMatchObject({ typoTolerance: false, distinct: true, query: "running" });
});
