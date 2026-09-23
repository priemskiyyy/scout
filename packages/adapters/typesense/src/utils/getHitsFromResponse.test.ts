import { expect, test } from "vitest";

import { getHitsFromResponse } from "src/utils/getHitsFromResponse";

const MARKERS = { open: "[open]", close: "[close]" };

test("each hit keeps its document and the whole Typesense hit", () => {
  const hit = {
    document: { id: "1", name: "Trail shoe" },
    text_match: 100,
    highlights: [{ field: "name", value: "Trail [open]shoe[close]" }],
  };

  expect(
    getHitsFromResponse({ found: 1, page: 1, hits: [hit] }, ["name"], MARKERS),
  ).toEqual([
    {
      document: hit.document,
      highlights: {
        name: [
          {
            path: ["name"],
            truncated: false,
            parts: [
              { text: "Trail ", matched: false },
              { text: "shoe", matched: true },
            ],
          },
        ],
      },
      native: hit,
    },
  ]);
});

test("a response without hits has none", () => {
  expect(getHitsFromResponse({ found: 0, page: 1 }, [], MARKERS)).toEqual([]);
});
