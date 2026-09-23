import { expect, test } from "vitest";

import type { MongoSearchMeta } from "src/types/MongoSearchMeta";
import { getTotalEntriesCountFromRows } from "src/utils/getTotalEntriesCountFromRows";

const getRows = (meta: MongoSearchMeta) => [
  { _id: "p1", __scout: { meta, score: 1 } },
];

test("a total count is exact", () => {
  expect(
    getTotalEntriesCountFromRows(getRows({ count: { total: 4200 } }), {
      current: 1,
    }),
  ).toEqual({ value: 4200, accuracy: "exact", scope: "matches" });
});

test("a lower bound is exact up to its threshold", () => {
  expect(
    getTotalEntriesCountFromRows(getRows({ count: { lowerBound: 1000 } }), {
      current: 1,
    }),
  ).toEqual({ value: 1000, accuracy: "exact", scope: "matches" });
});

test("a lower bound above its threshold is only a lower bound", () => {
  expect(
    getTotalEntriesCountFromRows(getRows({ count: { lowerBound: 1001 } }), {
      current: 1,
    }),
  ).toEqual({ value: 1001, accuracy: "lower-bound", scope: "matches" });
});

test("a count MongoDB did not send is unknown", () => {
  expect(getTotalEntriesCountFromRows(getRows({}), { current: 1 })).toEqual({
    accuracy: "unknown",
    scope: "matches",
  });
});

test("an empty first page means nothing matched", () => {
  expect(getTotalEntriesCountFromRows([], { current: 1 })).toEqual({
    value: 0,
    accuracy: "exact",
    scope: "matches",
  });
});

test("an empty later page carries no count", () => {
  expect(getTotalEntriesCountFromRows([], { current: 3 })).toEqual({
    accuracy: "unknown",
    scope: "matches",
  });
});
