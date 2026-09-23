import { expect, test } from "vitest";

import { getHitsFromResponse } from "src/utils/getHitsFromResponse";

const MARKERS = { open: "[open]", close: "[close]" };

test("each hit carries its source as the document and itself as native", () => {
  const hit = {
    _id: "1",
    _score: 2.5,
    _source: { id: "1", name: "Trail shoe" },
    highlight: { name: ["Trail [open]shoe[close]"] },
  };

  expect(
    getHitsFromResponse(
      {
        took: 1,
        timed_out: false,
        _shards: { failed: 0 },
        hits: { hits: [hit] },
      },
      ["name"],
      MARKERS,
    ),
  ).toEqual([
    {
      document: hit._source,
      highlights: {
        name: [
          {
            path: ["name"],
            parts: [
              { text: "Trail ", matched: false },
              { text: "shoe", matched: true },
            ],
            truncated: false,
          },
        ],
      },
      native: hit,
    },
  ]);
});
