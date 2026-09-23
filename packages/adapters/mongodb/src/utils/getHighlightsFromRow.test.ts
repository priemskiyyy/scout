import { expect, test } from "vitest";

import type { MongoSearchHighlight } from "src/types/MongoSearchHighlight";
import { getHighlightsFromRow } from "src/utils/getHighlightsFromRow";

const getRow = (highlights: MongoSearchHighlight[]) => ({
  _id: "p1",
  __scout: { meta: {}, score: 1, highlights },
});

test("each passage is a fragment of hits and the text around them", () => {
  expect(
    getHighlightsFromRow(
      getRow([
        {
          path: "name",
          score: 1,
          texts: [
            { value: "Trail running ", type: "text" },
            { value: "shoe", type: "hit" },
          ],
        },
      ]),
      ["name"],
    ),
  ).toEqual({
    name: [
      {
        path: ["name"],
        truncated: "unknown",
        parts: [
          { text: "Trail running ", matched: false },
          { text: "shoe", matched: true },
        ],
      },
    ],
  });
});

test("markup and astral characters in a document are text, never parsed", () => {
  const highlights = getHighlightsFromRow(
    getRow([
      {
        path: "name",
        score: 1,
        texts: [
          { value: "<mark>🥾 ", type: "text" },
          { value: "shoe", type: "hit" },
          { value: "</mark>", type: "text" },
        ],
      },
    ]),
    ["name"],
  );

  expect(highlights.name?.[0]?.parts).toEqual([
    { text: "<mark>🥾 ", matched: false },
    { text: "shoe", matched: true },
    { text: "</mark>", matched: false },
  ]);
});

test("every passage of a field is kept, and a field not requested is not", () => {
  const passage = (value: string): MongoSearchHighlight => ({
    path: "description",
    score: 1,
    texts: [{ value, type: "hit" }],
  });

  const highlights = getHighlightsFromRow(
    getRow([
      passage("first"),
      passage("second"),
      { path: "name", score: 1, texts: [{ value: "shoe", type: "hit" }] },
    ]),
    ["description"],
  );

  expect(Object.keys(highlights)).toEqual(["description"]);
  expect(
    highlights.description?.map((fragment) => fragment.parts[0]?.text),
  ).toEqual(["first", "second"]);
});

test("a row without highlights has none", () => {
  expect(
    getHighlightsFromRow({ _id: "p1", __scout: { meta: {}, score: 1 } }, [
      "name",
    ]),
  ).toEqual({});
});
