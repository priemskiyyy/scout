import type { AdapterSearchRequest } from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import type { TypesenseSearchOptions } from "src/types/TypesenseSearchOptions";
import { getSearchParameters } from "src/utils/getSearchParameters";

const MARKERS = { open: "[open]", close: "[close]" };

const getRequest = (
  overrides: Partial<AdapterSearchRequest<TypesenseSearchOptions>> = {},
): AdapterSearchRequest<TypesenseSearchOptions> => ({
  index: "products",
  query: "shoe",
  searchable: ["name", "brand"],
  profile: "default",
  sort: null,
  filter: null,
  facets: [],
  highlights: [],
  page: { current: 2, size: 5 },
  provider: null,
  ...overrides,
});

test("a plain search sends the query, its fields and its page, and nothing else", () => {
  expect(getSearchParameters(getRequest(), undefined, MARKERS)).toEqual({
    q: "shoe",
    query_by: "name,brand",
    page: 2,
    per_page: 5,
  });
});

test("an empty query is sent as the Typesense wildcard", () => {
  expect(
    getSearchParameters(getRequest({ query: "" }), undefined, MARKERS).q,
  ).toBe("*");
});

test("the profile's prefix setting is applied, and only when it has one", () => {
  expect(
    getSearchParameters(getRequest(), { prefix: false }, MARKERS).prefix,
  ).toBe(false);
  expect(getSearchParameters(getRequest(), {}, MARKERS)).not.toHaveProperty(
    "prefix",
  );
});

test("a filter, a sort and facets reach their parameters", () => {
  const parameters = getSearchParameters(
    getRequest({
      filter: {
        type: "comparison",
        field: "brand",
        operator: "eq",
        value: "A",
      },
      sort: { name: "priceAsc", by: [{ field: "price", direction: "asc" }] },
      facets: ["brand", "price"],
    }),
    undefined,
    MARKERS,
  );

  expect(parameters).toMatchObject({
    filter_by: "brand:=`A`",
    sort_by: "price:asc",
    facet_by: "brand,price",
  });
});

test("highlights ask for their fields between the search's own markers", () => {
  expect(
    getSearchParameters(
      getRequest({ highlights: ["name"] }),
      undefined,
      MARKERS,
    ),
  ).toMatchObject({
    highlight_fields: "name",
    highlight_start_tag: "[open]",
    highlight_end_tag: "[close]",
  });
});

test("provider options are carried beside what Scout writes", () => {
  expect(
    getSearchParameters(
      getRequest({ provider: { num_typos: 0, exhaustive_search: true } }),
      undefined,
      MARKERS,
    ),
  ).toMatchObject({ num_typos: 0, exhaustive_search: true, q: "shoe" });
});
