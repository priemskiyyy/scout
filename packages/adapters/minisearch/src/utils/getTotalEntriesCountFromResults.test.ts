import { expect, test } from "vitest";

import { createProductIndex } from "src/minisearch.fixture";
import { getTotalEntriesCountFromResults } from "src/utils/getTotalEntriesCountFromResults";

test("the total counts every result, exactly", () => {
  expect(
    getTotalEntriesCountFromResults(createProductIndex().search("shoe")),
  ).toEqual({ value: 5, accuracy: "exact", scope: "matches" });
});

test("nothing found is an exact zero", () => {
  expect(getTotalEntriesCountFromResults([])).toEqual({
    value: 0,
    accuracy: "exact",
    scope: "matches",
  });
});
