import { expect, test } from "vitest";

import { getFacetsFromResponse } from "src/utils/getFacetsFromResponse";

test("each facet is keyed by its field, with its values as the backend sent them", () => {
  const brand = { values: [{ value: "Apex", count: 2 }], exhaustive: false };

  expect(getFacetsFromResponse({ hits: [], facets: { brand } })).toEqual({
    brand: {
      values: [{ value: "Apex", count: 2 }],
      exhaustive: false,
      native: brand,
    },
  });
});

test("an exhaustiveness the backend never claimed is unknown", () => {
  expect(
    getFacetsFromResponse({
      hits: [],
      facets: { brand: { values: [{ value: "Apex", count: 2 }] } },
    }).brand?.exhaustive,
  ).toBe("unknown");
});

test("an answer without facets has none", () => {
  expect(getFacetsFromResponse({ hits: [] })).toEqual({});
});
