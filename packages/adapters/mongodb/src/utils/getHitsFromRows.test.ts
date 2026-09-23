import { expect, test } from "vitest";

import { getHitsFromRows } from "src/utils/getHitsFromRows";

test("each row is its document without __scout, and the whole row is native", () => {
  const row = {
    _id: "p1",
    name: "Trail shoe",
    __scout: {
      meta: {},
      score: 2.5,
      highlights: [
        {
          path: "name",
          score: 1,
          texts: [
            { value: "Trail ", type: "text" },
            { value: "shoe", type: "hit" },
          ],
        },
      ],
    },
  } satisfies Parameters<typeof getHitsFromRows>[0][number];

  expect(getHitsFromRows([row], ["name"])).toEqual([
    {
      document: { _id: "p1", name: "Trail shoe" },
      highlights: {
        name: [
          {
            path: ["name"],
            truncated: "unknown",
            parts: [
              { text: "Trail ", matched: false },
              { text: "shoe", matched: true },
            ],
          },
        ],
      },
      native: row,
    },
  ]);
});

test("no rows are no hits", () => {
  expect(getHitsFromRows([], [])).toEqual([]);
});
