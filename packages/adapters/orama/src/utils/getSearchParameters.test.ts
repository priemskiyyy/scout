import type { AdapterSearchRequest } from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import { createProductDatabase } from "src/orama.fixture";
import { getSearchParameters } from "src/utils/getSearchParameters";

const { schema } = createProductDatabase();

const getRequest = (
  overrides: Partial<AdapterSearchRequest> = {},
): AdapterSearchRequest => ({
  index: "products",
  query: "",
  searchable: ["name", "description"],
  profile: "default",
  sort: null,
  filter: null,
  facets: [],
  highlights: [],
  page: { current: 2, size: 5 },
  provider: null,
  ...overrides,
});

// With an empty term and properties, Orama still matches a token, so neither
// is sent to browse.
test("a browse sends the page and nothing to match", () => {
  expect(getSearchParameters(getRequest(), undefined, schema)).toEqual({
    limit: 5,
    offset: 5,
    facets: {},
  });
});

test("a query becomes the term, over the profile's fields", () => {
  expect(
    getSearchParameters(getRequest({ query: "mug" }), undefined, schema),
  ).toMatchObject({ term: "mug", properties: ["name", "description"] });
});

test("a profile's tuning is applied", () => {
  expect(
    getSearchParameters(getRequest(), { tolerance: 2 }, schema).tolerance,
  ).toBe(2);
});

test("a filter, a sort and facets reach their parameters", () => {
  expect(
    getSearchParameters(
      getRequest({
        filter: {
          type: "comparison",
          field: "brand",
          operator: "eq",
          value: "Acme Audio",
        },
        sort: { name: "priceAsc", by: [{ field: "price", direction: "asc" }] },
        facets: ["brand"],
      }),
      undefined,
      schema,
    ),
  ).toMatchObject({
    where: { brand: { eq: "Acme Audio" } },
    sortBy: { property: "price", order: "ASC" },
    facets: { brand: {} },
  });
});
