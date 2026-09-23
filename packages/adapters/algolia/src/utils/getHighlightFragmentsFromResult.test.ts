import { expect, test } from "vitest";

import type { AlgoliaHighlightResultOption } from "src/types/AlgoliaHighlightResultOption";
import { getHighlightFragmentsFromResult } from "src/utils/getHighlightFragmentsFromResult";

const MARKERS = { open: "[open]", close: "[close]" };

const getOption = (value: string): AlgoliaHighlightResultOption => ({
  value,
  matchLevel: "full",
  matchedWords: [],
});

test("a value is one whole fragment split on the search's markers", () => {
  expect(
    getHighlightFragmentsFromResult(
      getOption("Acme [open]running[close] shoe"),
      ["title"],
      MARKERS,
    ),
  ).toEqual([
    {
      path: ["title"],
      truncated: false,
      parts: [
        { text: "Acme ", matched: false },
        { text: "running", matched: true },
        { text: " shoe", matched: false },
      ],
    },
  ]);
});

test("an array reports which element matched", () => {
  expect(
    getHighlightFragmentsFromResult(
      [getOption("[open]running[close]"), getOption("sale")],
      ["tags"],
      MARKERS,
    ),
  ).toEqual([
    {
      path: ["tags", 0],
      truncated: false,
      parts: [{ text: "running", matched: true }],
    },
    {
      path: ["tags", 1],
      truncated: false,
      parts: [{ text: "sale", matched: false }],
    },
  ]);
});

test("a nested object is walked, and each value keeps its path", () => {
  expect(
    getHighlightFragmentsFromResult(
      { city: getOption("[open]Berlin[close]") },
      ["address"],
      MARKERS,
    ),
  ).toEqual([
    {
      path: ["address", "city"],
      truncated: false,
      parts: [{ text: "Berlin", matched: true }],
    },
  ]);
});

// A document can have an attribute called `value`, and then its result is an
// object holding a result under that key, not marked text.
test("a nested attribute named value is walked rather than read as a value", () => {
  expect(
    getHighlightFragmentsFromResult(
      { value: getOption("[open]cheap[close]"), currency: getOption("EUR") },
      ["price"],
      MARKERS,
    ),
  ).toEqual([
    {
      path: ["price", "value"],
      truncated: false,
      parts: [{ text: "cheap", matched: true }],
    },
    {
      path: ["price", "currency"],
      truncated: false,
      parts: [{ text: "EUR", matched: false }],
    },
  ]);
});

test("an unbalanced marker degrades to plain text instead of a guess", () => {
  expect(
    getHighlightFragmentsFromResult(
      getOption("Acme [open]running shoe"),
      ["title"],
      MARKERS,
    )[0]?.parts,
  ).toEqual([{ text: "Acme running shoe", matched: false }]);
});

test("an attribute Algolia did not highlight has no fragments", () => {
  expect(
    getHighlightFragmentsFromResult(undefined, ["title"], MARKERS),
  ).toEqual([]);
});
