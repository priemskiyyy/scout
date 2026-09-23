import { expect, test } from "vitest";

import type { AlgoliaHit } from "src/types/AlgoliaHit";

import { getHitsFromResponse } from "src/utils/getHitsFromResponse";

const MARKERS = { open: "[open]", close: "[close]" };

test("the document drops Algolia's metadata, which stays on the whole hit", () => {
  const hit: AlgoliaHit = {
    objectID: "1",
    title: "Acme running shoe",
    _highlightResult: {
      title: {
        value: "Acme [open]running[close] shoe",
        matchLevel: "full",
        matchedWords: ["running"],
      },
    },
    _rankingInfo: { nbTypos: 0 },
  };

  expect(getHitsFromResponse({ hits: [hit] }, ["title"], MARKERS)).toEqual([
    {
      document: { objectID: "1", title: "Acme running shoe" },
      highlights: {
        title: [
          {
            path: ["title"],
            truncated: false,
            parts: [
              { text: "Acme ", matched: false },
              { text: "running", matched: true },
              { text: " shoe", matched: false },
            ],
          },
        ],
      },
      native: hit,
    },
  ]);
});

test("a response without hits has none", () => {
  expect(getHitsFromResponse({ hits: [] }, [], MARKERS)).toEqual([]);
});
