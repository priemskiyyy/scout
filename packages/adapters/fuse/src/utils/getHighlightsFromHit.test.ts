import { expect, test } from "vitest";

import { getHighlightsFromHit } from "src/utils/getHighlightsFromHit";

test("every requested field is present, and nothing else", () => {
  const highlights = getHighlightsFromHit(
    {
      item: { title: "shoe", category: "footwear" },
      refIndex: 0,
      matches: [{ key: "title", value: "shoe", indices: [[0, 3]] }],
    },
    ["title"],
  );

  expect(highlights).toEqual({
    title: [
      {
        path: ["title"],
        truncated: false,
        parts: [{ text: "shoe", matched: true }],
      },
    ],
  });
});
