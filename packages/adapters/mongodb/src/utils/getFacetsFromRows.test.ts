import { expect, test } from "vitest";

import { getFacetsFromRows } from "src/utils/getFacetsFromRows";

test("each facet's buckets become its values, not known to be exhaustive", () => {
  const brand = {
    buckets: [
      { _id: "Nimbus", count: 2 },
      { _id: "Halden", count: 1 },
    ],
  };

  expect(
    getFacetsFromRows([
      { _id: "p1", __scout: { meta: { facet: { brand } }, score: 1 } },
    ]),
  ).toEqual({
    brand: {
      values: [
        { value: "Nimbus", count: 2 },
        { value: "Halden", count: 1 },
      ],
      exhaustive: "unknown",
      native: brand,
    },
  });
});

test("a search without facets, or without rows, has none", () => {
  expect(
    getFacetsFromRows([{ _id: "p1", __scout: { meta: {}, score: 1 } }]),
  ).toEqual({});
  expect(getFacetsFromRows([])).toEqual({});
});
