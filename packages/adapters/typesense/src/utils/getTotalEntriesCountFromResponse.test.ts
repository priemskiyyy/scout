import { expect, test } from "vitest";

import { getTotalEntriesCountFromResponse } from "src/utils/getTotalEntriesCountFromResponse";

test("a count Typesense finished is exact", () => {
  expect(getTotalEntriesCountFromResponse({ found: 3, page: 1 })).toEqual({
    value: 3,
    accuracy: "exact",
    scope: "matches",
  });
});

test("a count Typesense cut short is an estimate", () => {
  expect(
    getTotalEntriesCountFromResponse({
      found: 3,
      page: 1,
      search_cutoff: true,
    }),
  ).toEqual({ value: 3, accuracy: "estimated", scope: "matches" });
});
