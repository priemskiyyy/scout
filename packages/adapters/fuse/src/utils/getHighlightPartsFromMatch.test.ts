import { expect, test } from "vitest";

import { getHighlightPartsFromMatch } from "src/utils/getHighlightPartsFromMatch";

test("inclusive ranges become alternating parts", () => {
  expect(
    getHighlightPartsFromMatch("Running shoe", {
      value: "Running shoe",
      indices: [[8, 11]],
    }),
  ).toEqual([
    { text: "Running ", matched: false },
    { text: "shoe", matched: true },
  ]);
});

test("a value without a match is plain text", () => {
  expect(getHighlightPartsFromMatch("shoe", undefined)).toEqual([
    { text: "shoe", matched: false },
  ]);
  expect(
    getHighlightPartsFromMatch("shoe", { value: "shoe", indices: [] }),
  ).toEqual([{ text: "shoe", matched: false }]);
});

test.each(
  [
    [[-1, 2]],
    [[0, 50]],
    [[2, 1]],
    [[0.5, 2]],
    [
      [0, 2],
      [1, 3],
    ],
    [[0, 0]],
  ].map((indices) => ({ indices })),
)(
  "malformed or split-surrogate ranges degrade to the original text: $indices",
  ({ indices }) => {
    expect(
      getHighlightPartsFromMatch("😀 shoe", {
        value: "😀 shoe",
        indices: indices.map((range): [number, number] => [
          range[0] ?? -1,
          range[1] ?? -1,
        ]),
      }),
    ).toEqual([{ text: "😀 shoe", matched: false }]);
  },
);

test("stale match text cannot replace the document's own text", () => {
  expect(
    getHighlightPartsFromMatch("shoe", { value: "other", indices: [[0, 3]] }),
  ).toEqual([{ text: "shoe", matched: false }]);
});
