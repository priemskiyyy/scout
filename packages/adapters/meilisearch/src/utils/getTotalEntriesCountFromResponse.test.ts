import { expect, test } from "vitest";

import { getTotalEntriesCountFromResponse } from "src/utils/getTotalEntriesCountFromResponse";

test("page mode reports an exhaustive count below the cap", () => {
  expect(
    getTotalEntriesCountFromResponse({ hits: [], totalHits: 5 }, "page", 1000),
  ).toEqual({ value: 5, accuracy: "exact", scope: "matches" });
});

test("a count that reaches maxTotalHits is a cap, not a count", () => {
  expect(
    getTotalEntriesCountFromResponse({ hits: [], totalHits: 2 }, "page", 2),
  ).toEqual({ value: 2, accuracy: "lower-bound", scope: "retrievable" });
});

test("offset mode never calls its estimate exact", () => {
  expect(
    getTotalEntriesCountFromResponse(
      { hits: [], estimatedTotalHits: 5 },
      "offset",
      1000,
    ),
  ).toEqual({ value: 5, accuracy: "estimated", scope: "matches" });
});

test("a response with no count reports an unknown total in either mode", () => {
  expect(getTotalEntriesCountFromResponse({ hits: [] }, "page", 1000)).toEqual({
    accuracy: "unknown",
    scope: "unknown",
  });
  expect(
    getTotalEntriesCountFromResponse({ hits: [] }, "offset", 1000),
  ).toEqual({ accuracy: "unknown", scope: "unknown" });
});
