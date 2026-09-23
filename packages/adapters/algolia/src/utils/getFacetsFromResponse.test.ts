import { expect, test } from "vitest";

import { getFacetsFromResponse } from "src/utils/getFacetsFromResponse";

const BRAND = { acme: 2, bolt: 1 };

test("a requested facet carries Algolia's values, counts and exhaustiveness", () => {
  expect(
    getFacetsFromResponse(
      {
        hits: [],
        facets: { brand: BRAND, price: { "79": 1 } },
        exhaustive: { facetValues: true },
      },
      ["brand"],
    ),
  ).toEqual({
    brand: {
      values: [
        { value: "acme", count: 2 },
        { value: "bolt", count: 1 },
      ],
      exhaustive: true,
      native: BRAND,
    },
  });
});

test("a facet whose counting Algolia said nothing about is unknown", () => {
  expect(
    getFacetsFromResponse({ hits: [], facets: { brand: BRAND } }, ["brand"])
      .brand?.exhaustive,
  ).toBe("unknown");
});

// Left out, so the core reports it unknown rather than as an exhaustive empty.
test("a facet Algolia did not return is left out", () => {
  expect(getFacetsFromResponse({ hits: [] }, ["brand"])).toEqual({});
});
