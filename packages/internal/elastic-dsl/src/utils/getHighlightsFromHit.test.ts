import { expect, test } from "vitest";

import { getHighlightsFromHit } from "src/utils/getHighlightsFromHit";

const MARKERS = { open: "[open]", close: "[close]" };

test("a highlighted string field is one whole fragment of safe parts", () => {
  expect(
    getHighlightsFromHit(
      {
        _source: { name: "Trail <b>shoe</b>" },
        highlight: { name: ["Trail <b>[open]shoe[close]</b>"] },
      },
      ["name"],
      MARKERS,
    ),
  ).toEqual({
    name: [
      {
        path: ["name"],
        parts: [
          { text: "Trail <b>", matched: false },
          { text: "shoe", matched: true },
          { text: "</b>", matched: false },
        ],
        truncated: false,
      },
    ],
  });
});

test("an array field's fragments are its matching values, so what was left out is unknown", () => {
  const highlights = getHighlightsFromHit(
    {
      _source: { tags: ["sport", "shoe"] },
      highlight: { tags: ["[open]shoe[close]"] },
    },
    ["tags"],
    MARKERS,
  );

  expect(highlights.tags).toEqual([
    {
      path: ["tags"],
      parts: [{ text: "shoe", matched: true }],
      truncated: "unknown",
    },
  ]);
});

test("a forged or unbalanced marker degrades to plain text", () => {
  const highlights = getHighlightsFromHit(
    {
      _source: { name: "a [open]b" },
      highlight: { name: ["a [open]b"] },
    },
    ["name"],
    MARKERS,
  );

  expect(highlights.name?.[0]?.parts).toEqual([
    { text: "a b", matched: false },
  ]);
});

test("astral characters survive the split", () => {
  const highlights = getHighlightsFromHit(
    {
      _source: { name: "🏃 shoe" },
      highlight: { name: ["🏃 [open]shoe[close]"] },
    },
    ["name"],
    MARKERS,
  );

  expect(highlights.name?.[0]?.parts).toEqual([
    { text: "🏃 ", matched: false },
    { text: "shoe", matched: true },
  ]);
});

test("only requested fields are read, and a hit without highlights has none", () => {
  expect(
    getHighlightsFromHit(
      { _source: {}, highlight: { brand: ["[open]Acme[close]"] } },
      ["name"],
      MARKERS,
    ),
  ).toEqual({});
  expect(getHighlightsFromHit({ _source: {} }, ["name"], MARKERS)).toEqual({});
});

test("a requested field named like an Object method is not read from the prototype", () => {
  expect(
    getHighlightsFromHit({ _source: {}, highlight: {} }, ["toString"], MARKERS),
  ).toEqual({});
});
