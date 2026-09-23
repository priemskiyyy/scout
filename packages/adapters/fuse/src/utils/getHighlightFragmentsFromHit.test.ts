import Fuse from "fuse.js";
import { expect, test } from "vitest";

import { getHighlightFragmentsFromHit } from "src/utils/getHighlightFragmentsFromHit";

const getHit = <TDocument>(documents: readonly TDocument[], keys: string[]) => {
  const [hit] = new Fuse(documents, {
    keys,
    includeMatches: true,
    threshold: 0,
    ignoreLocation: true,
  }).search("京都");

  if (hit === undefined) {
    throw new Error("Fuse found nothing.");
  }

  return hit;
};

test("a text field keeps non-ASCII text and its inclusive match range", () => {
  expect(
    getHighlightFragmentsFromHit(
      getHit([{ title: "Café ☕ 京都" }], ["title"]),
      "title",
    ),
  ).toEqual([
    {
      path: ["title"],
      truncated: false,
      parts: [
        { text: "Café ☕ ", matched: false },
        { text: "京都", matched: true },
      ],
    },
  ]);
});

test("an array field keeps each element's path and its untouched value", () => {
  expect(
    getHighlightFragmentsFromHit(
      getHit([{ tags: ["casual", "京都"] }], ["tags"]),
      "tags",
    ),
  ).toEqual([
    {
      path: ["tags", 0],
      truncated: false,
      parts: [{ text: "casual", matched: false }],
    },
    {
      path: ["tags", 1],
      truncated: false,
      parts: [{ text: "京都", matched: true }],
    },
  ]);
});

test("a field that holds no text has no fragments", () => {
  expect(
    getHighlightFragmentsFromHit({ item: { price: 90 }, refIndex: 0 }, "price"),
  ).toEqual([]);
  expect(
    getHighlightFragmentsFromHit({ item: {}, refIndex: 0 }, "title"),
  ).toEqual([]);
});
