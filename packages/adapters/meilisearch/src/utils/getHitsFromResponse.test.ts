import { expect, test } from "vitest";

import { getHitsFromResponse } from "src/utils/getHitsFromResponse";

const MARKERS = { open: "[open]", close: "[close]" };

test("the document loses Meilisearch's own keys while the raw hit is kept", () => {
  const hit = {
    id: "6",
    title: "Wool sock",
    _formatted: { title: "Wool [open]sock[close]" },
    _matchesPosition: {},
    _rankingScore: 0.9,
  };

  expect(
    getHitsFromResponse({ hits: [hit] }, ["title"], MARKERS, false),
  ).toEqual([
    {
      document: { id: "6", title: "Wool sock" },
      highlights: {
        title: [
          {
            path: ["title"],
            truncated: false,
            parts: [
              { text: "Wool ", matched: false },
              { text: "sock", matched: true },
            ],
          },
        ],
      },
      native: hit,
    },
  ]);
});

test("every requested field is present, even one Meilisearch did not format", () => {
  expect(
    getHitsFromResponse({ hits: [{ id: "1" }] }, ["title"], MARKERS, false)[0]
      ?.highlights,
  ).toEqual({ title: [] });
});
