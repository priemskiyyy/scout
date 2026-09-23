import { expect, test } from "vitest";

import type { ElasticSearchResponseBody } from "src/types/ElasticSearchResponseBody";
import type { ElasticTermsAggregate } from "src/types/ElasticTermsAggregate";
import { getFacetsFromResponse } from "src/utils/getFacetsFromResponse";

const BRAND = {
  sum_other_doc_count: 0,
  doc_count_error_upper_bound: 0,
  buckets: [{ key: "Acme", doc_count: 2 }],
};

const getBody = (
  aggregations: Record<string, ElasticTermsAggregate>,
): ElasticSearchResponseBody => ({
  took: 1,
  timed_out: false,
  _shards: { failed: 0 },
  hits: { hits: [] },
  aggregations,
});

test("each facet is keyed by its field, with its values as the engine sent them", () => {
  expect(getFacetsFromResponse(getBody({ brand: BRAND }))).toEqual({
    brand: {
      values: [{ value: "Acme", count: 2 }],
      exhaustive: true,
      native: BRAND,
    },
  });
});

test("a boolean facet passes on the key spelled out", () => {
  const facets = getFacetsFromResponse(
    getBody({
      inStock: {
        ...BRAND,
        buckets: [
          { key: 1, key_as_string: "true", doc_count: 3 },
          { key: 0, key_as_string: "false", doc_count: 1 },
        ],
      },
    }),
  );

  expect(facets.inStock?.values).toEqual([
    { value: "true", count: 3 },
    { value: "false", count: 1 },
  ]);
});

test("a facet that left values out, or may have undercounted, is not exhaustive", () => {
  expect(
    getFacetsFromResponse(
      getBody({ brand: { ...BRAND, sum_other_doc_count: 4 } }),
    ).brand?.exhaustive,
  ).toBe(false);
  expect(
    getFacetsFromResponse(
      getBody({ brand: { ...BRAND, doc_count_error_upper_bound: 1 } }),
    ).brand?.exhaustive,
  ).toBe(false);
});

test("a facet the engine could not bound is unknown", () => {
  expect(
    getFacetsFromResponse(
      getBody({ brand: { ...BRAND, doc_count_error_upper_bound: -1 } }),
    ).brand?.exhaustive,
  ).toBe("unknown");
  expect(
    getFacetsFromResponse(getBody({ brand: { buckets: BRAND.buckets } })).brand
      ?.exhaustive,
  ).toBe("unknown");
});

test("a facet from a partial answer is not exhaustive", () => {
  expect(
    getFacetsFromResponse({ ...getBody({ brand: BRAND }), timed_out: true })
      .brand?.exhaustive,
  ).toBe(false);
});

test("keyed buckets are read in the order the engine sent them", () => {
  expect(
    getFacetsFromResponse(
      getBody({
        brand: {
          ...BRAND,
          buckets: {
            Acme: { key: "Acme", doc_count: 2 },
            Halden: { key: "Halden", doc_count: 1 },
          },
        },
      }),
    ).brand?.values,
  ).toEqual([
    { value: "Acme", count: 2 },
    { value: "Halden", count: 1 },
  ]);
});

test("a bucket without a count is refused as a provider answer", () => {
  expect(() =>
    getFacetsFromResponse(getBody({ brand: { buckets: [{ key: "Acme" }] } })),
  ).toThrow(
    expect.objectContaining({
      code: "provider",
      message: "The brand aggregation answered a bucket without a count.",
    }),
  );
});

test("an answer without aggregations has no facets", () => {
  expect(
    getFacetsFromResponse({
      took: 1,
      timed_out: false,
      _shards: { failed: 0 },
      hits: { hits: [] },
    }),
  ).toEqual({});
});
