import { createHighlightMarkers } from "@priemskiyyy/scout/adapter";
import { expect, test } from "vitest";

import type { AlgoliaHit } from "src/types/AlgoliaHit";

import { getHighlightsFromHit } from "src/utils/getHighlightsFromHit";

const MARKERS = createHighlightMarkers();

test("every requested field is present, and one Algolia did not highlight is empty", () => {
  const hit: AlgoliaHit = {
    objectID: "1",
    _highlightResult: {
      title: {
        value: `${MARKERS.open}shoe${MARKERS.close}`,
        matchLevel: "full",
        matchedWords: ["shoe"],
      },
      brand: { value: "acme", matchLevel: "none", matchedWords: [] },
    },
  };

  expect(getHighlightsFromHit(hit, ["title", "summary"], MARKERS)).toEqual({
    title: [
      {
        path: ["title"],
        truncated: false,
        parts: [{ text: "shoe", matched: true }],
      },
    ],
    summary: [],
  });
});

test("a document that contains markup cannot forge a highlight", () => {
  const hit: AlgoliaHit = {
    objectID: "1",
    _highlightResult: {
      title: {
        value: `Lamp with <em>${MARKERS.open}markup${MARKERS.close}</em> inside`,
        matchLevel: "full",
        matchedWords: ["markup"],
      },
    },
  };

  expect(
    getHighlightsFromHit(hit, ["title"], MARKERS).title?.[0]?.parts,
  ).toEqual([
    { text: "Lamp with <em>", matched: false },
    { text: "markup", matched: true },
    { text: "</em> inside", matched: false },
  ]);
});

test("a hit Algolia highlighted nothing on has no highlights", () => {
  expect(getHighlightsFromHit({ objectID: "1" }, ["title"], MARKERS)).toEqual(
    {},
  );
});
