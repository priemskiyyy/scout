import { expect, test } from "vitest";

import { getFacetsFromResponse } from "src/utils/getFacetsFromResponse";

const RESPONSE = {
  hits: [],
  facetDistribution: {
    brand: { Apex: 2, Vertex: 2, Forge: 1 },
    price: { "45": 1, "120": 1 },
    inStock: { true: 1 },
  },
  facetStats: { price: { min: 45, max: 120 } },
};

test("a requested facet carries its distribution, its stats and no claim of completeness", () => {
  expect(getFacetsFromResponse(RESPONSE, ["brand", "price"])).toEqual({
    brand: {
      values: [
        { value: "Apex", count: 2 },
        { value: "Vertex", count: 2 },
        { value: "Forge", count: 1 },
      ],
      exhaustive: "unknown",
      native: { distribution: { Apex: 2, Vertex: 2, Forge: 1 }, stats: null },
    },
    price: {
      values: [
        { value: "45", count: 1 },
        { value: "120", count: 1 },
      ],
      exhaustive: "unknown",
      native: {
        distribution: { "45": 1, "120": 1 },
        stats: { min: 45, max: 120 },
      },
    },
  });
});

test("a response without a distribution has no facets", () => {
  expect(getFacetsFromResponse({ hits: [] }, ["brand"])).toEqual({});
});
