import { expect, test } from "vitest";

import { getTotalEntriesCountFromResponse } from "src/utils/getTotalEntriesCountFromResponse";

test("Orama's count of every match is exact", () => {
  expect(
    getTotalEntriesCountFromResponse({
      count: 6,
      hits: [],
      elapsed: { raw: 1 },
    }),
  ).toEqual({ value: 6, accuracy: "exact", scope: "matches" });
});
