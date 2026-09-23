import { expect, test } from "vitest";

import type { ElasticSearchResponseBody } from "src/types/ElasticSearchResponseBody";
import { getTotalEntriesCountFromResponse } from "src/utils/getTotalEntriesCountFromResponse";

const getBody = (
  total: ElasticSearchResponseBody["hits"]["total"],
): ElasticSearchResponseBody => ({
  took: 1,
  timed_out: false,
  _shards: { failed: 0 },
  hits: { total, hits: [] },
});

test("a count the engine finished is exact", () => {
  expect(
    getTotalEntriesCountFromResponse(getBody({ value: 3, relation: "eq" })),
  ).toEqual({ value: 3, accuracy: "exact", scope: "matches" });
});

test("a count the engine stopped is a lower bound", () => {
  expect(
    getTotalEntriesCountFromResponse(
      getBody({ value: 10_000, relation: "gte" }),
    ),
  ).toEqual({ value: 10_000, accuracy: "lower-bound", scope: "matches" });
});

test("a count reported as a bare number is exact", () => {
  expect(getTotalEntriesCountFromResponse(getBody(3))).toEqual({
    value: 3,
    accuracy: "exact",
    scope: "matches",
  });
});

test("a count from a partial answer is a lower bound", () => {
  expect(
    getTotalEntriesCountFromResponse({
      ...getBody({ value: 3, relation: "eq" }),
      timed_out: true,
    }),
  ).toEqual({ value: 3, accuracy: "lower-bound", scope: "matches" });
  expect(
    getTotalEntriesCountFromResponse({ ...getBody(3), _shards: { failed: 2 } }),
  ).toEqual({ value: 3, accuracy: "lower-bound", scope: "matches" });
});

test("an answer without a count has an unknown total", () => {
  expect(getTotalEntriesCountFromResponse(getBody(undefined))).toEqual({
    accuracy: "unknown",
    scope: "matches",
  });
});
