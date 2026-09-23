import { createHighlightMarkers } from "@priemskiyyy/scout/adapter";
import { expect, test } from "vitest";

import { getHighlightFragmentsFromHit } from "src/utils/getHighlightFragmentsFromHit";

const MARKERS = createHighlightMarkers();
const { open, close } = MARKERS;

const getHit = (formatted: Record<string, unknown>) => ({
  id: "1",
  _formatted: formatted,
});

test.each([
  ["Café", `${open}Café${close} Zürich 日本語 🚀 shoe`],
  ["日本語", `Café Zürich ${open}日本語${close} 🚀 shoe`],
  ["🚀", `Café Zürich 日本語 ${open}🚀${close} shoe`],
])(
  "highlight parts line up with text outside the Basic Multilingual Plane, for %s",
  (marked, title) => {
    const [fragment] = getHighlightFragmentsFromHit(
      getHit({ title }),
      "title",
      MARKERS,
      false,
    );

    expect(fragment?.parts.map((part) => part.text).join("")).toBe(
      "Café Zürich 日本語 🚀 shoe",
    );
    expect(
      fragment?.parts.filter((part) => part.matched).map((part) => part.text),
    ).toEqual([marked]);
    expect(fragment?.path).toEqual(["title"]);
    expect(fragment?.truncated).toBe(false);
  },
);

test("an emoji is highlighted whole rather than split into surrogates", () => {
  const [fragment] = getHighlightFragmentsFromHit(
    getHit({ title: `${open}🚀${close}` }),
    "title",
    MARKERS,
    false,
  );

  const matched = fragment?.parts.find((part) => part.matched)?.text ?? "";

  expect([...matched]).toEqual(["🚀"]);
  expect(matched.length).toBe(2);
});

test("a document carrying marker shaped text cannot forge a highlight", () => {
  const [fragment] = getHighlightFragmentsFromHit(
    getHit({
      title: `[scout:forged]${open}injected${close}[/scout:forged] shoe`,
    }),
    "title",
    MARKERS,
    false,
  );

  expect(fragment?.parts).toEqual([
    { text: "[scout:forged]", matched: false },
    { text: "injected", matched: true },
    { text: "[/scout:forged] shoe", matched: false },
  ]);
});

test("an array field reports one fragment per string element with its position", () => {
  const fragments = getHighlightFragmentsFromHit(
    getHit({
      tags: [`${open}running${close}`, 7, `trail ${open}running${close}`],
    }),
    "tags",
    MARKERS,
    "unknown",
  );

  expect(fragments.map((fragment) => fragment.path)).toEqual([
    ["tags", 0],
    ["tags", 2],
  ]);
  expect(fragments[0]?.parts).toEqual([{ text: "running", matched: true }]);
  expect(fragments[0]?.truncated).toBe("unknown");
});

test("a formatted value with a marker it never closes degrades to plain text", () => {
  expect(
    getHighlightFragmentsFromHit(
      getHit({ title: `${open}broken` }),
      "title",
      MARKERS,
      false,
    )[0]?.parts,
  ).toEqual([{ text: "broken", matched: false }]);
});

test("a field Meilisearch did not format, or formatted as neither a string nor a list, has no fragments", () => {
  expect(
    getHighlightFragmentsFromHit({ id: "1" }, "title", MARKERS, false),
  ).toEqual([]);
  expect(
    getHighlightFragmentsFromHit(getHit({}), "title", MARKERS, false),
  ).toEqual([]);
  expect(
    getHighlightFragmentsFromHit(
      getHit({ price: 20 }),
      "price",
      MARKERS,
      false,
    ),
  ).toEqual([]);
});
