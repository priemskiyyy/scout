import { expect, test } from "vitest";

import { getTotalEntriesCountFromResponse } from "src/utils/getTotalEntriesCountFromResponse";

test("a count inside the pagination window is exact and retrievable", () => {
  expect(
    getTotalEntriesCountFromResponse(
      { hits: [], nbHits: 2, exhaustive: { nbHits: true } },
      1000,
    ),
  ).toEqual({ value: 2, accuracy: "exact", scope: "retrievable" });
});

test("matches past the pagination window are counted as matches, not as retrievable", () => {
  expect(
    getTotalEntriesCountFromResponse(
      { hits: [], nbHits: 100, exhaustive: { nbHits: true } },
      4,
    ),
  ).toEqual({ value: 100, accuracy: "exact", scope: "matches" });
});

test("an approximated count is an estimate", () => {
  expect(
    getTotalEntriesCountFromResponse(
      { hits: [], nbHits: 5, exhaustive: { nbHits: false } },
      1000,
    ),
  ).toEqual({ value: 5, accuracy: "estimated", scope: "retrievable" });
});

test("a count Algolia said nothing about is unknown, not exact", () => {
  expect(
    getTotalEntriesCountFromResponse({ hits: [], nbHits: 5 }, 1000),
  ).toEqual({ accuracy: "unknown", scope: "retrievable" });
});

test("a response with no count keeps its uncertainty", () => {
  expect(getTotalEntriesCountFromResponse({ hits: [] }, 1000)).toEqual({
    accuracy: "unknown",
    scope: "unknown",
  });
});
