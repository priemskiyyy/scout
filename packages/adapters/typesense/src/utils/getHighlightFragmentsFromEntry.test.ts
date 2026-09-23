import { expect, test } from "vitest";

import { getHighlightFragmentsFromEntry } from "src/utils/getHighlightFragmentsFromEntry";

const MARKERS = { open: "[open]", close: "[close]" };

test("a whole value is one fragment that nothing was cut from", () => {
  expect(
    getHighlightFragmentsFromEntry(
      "name",
      { field: "name", value: "Trail [open]shoe[close]" },
      MARKERS,
    ),
  ).toEqual([
    {
      path: ["name"],
      truncated: false,
      parts: [
        { text: "Trail ", matched: false },
        { text: "shoe", matched: true },
      ],
    },
  ]);
});

test("a snippet does not say how much of the field it left out", () => {
  expect(
    getHighlightFragmentsFromEntry(
      "name",
      { field: "name", snippet: "[open]shoe[close] for trails" },
      MARKERS,
    )[0]?.truncated,
  ).toBe("unknown");
});

test("an array field says which element matched", () => {
  expect(
    getHighlightFragmentsFromEntry(
      "tags",
      { field: "tags", snippets: ["[open]shoe[close]"], indices: [1] },
      MARKERS,
    ),
  ).toEqual([
    {
      path: ["tags", 1],
      truncated: "unknown",
      parts: [{ text: "shoe", matched: true }],
    },
  ]);
});

test("an entry with nothing marked has no fragments", () => {
  expect(
    getHighlightFragmentsFromEntry("name", { field: "name" }, MARKERS),
  ).toEqual([]);
});
