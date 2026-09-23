import { expect, test } from "vitest";

import { getFacetsFromResponse } from "src/utils/getFacetsFromResponse";

const COUNTS = {
  field_name: "price",
  sampled: false,
  counts: [{ value: "120", count: 1 }],
};

test("each facet is keyed by its field, with its values as Typesense sent them", () => {
  expect(
    getFacetsFromResponse({ found: 1, page: 1, facet_counts: [COUNTS] }),
  ).toEqual({
    price: {
      values: [{ value: "120", count: 1 }],
      exhaustive: true,
      native: COUNTS,
    },
  });
});

test("a sampled facet is not exhaustive", () => {
  expect(
    getFacetsFromResponse({
      found: 1,
      page: 1,
      facet_counts: [{ ...COUNTS, sampled: true }],
    }).price?.exhaustive,
  ).toBe(false);
});

test("a response without facets has none", () => {
  expect(getFacetsFromResponse({ found: 1, page: 1 })).toEqual({});
});
