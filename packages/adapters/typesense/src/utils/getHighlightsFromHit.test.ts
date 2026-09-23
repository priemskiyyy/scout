import { createHighlightMarkers } from "@priemskiyyy/scout/adapter";
import { expect, test } from "vitest";

import { getHighlightsFromHit } from "src/utils/getHighlightsFromHit";

const MARKERS = createHighlightMarkers();

const getHit = (snippet: string) => ({
  document: { id: "1" },
  highlights: [
    { field: "name", snippet },
    { field: "brand", snippet },
  ],
});

test("only the fields that were asked for are reported", () => {
  expect(
    Object.keys(
      getHighlightsFromHit(
        getHit(`${MARKERS.open}shoe${MARKERS.close}`),
        ["name"],
        MARKERS,
      ),
    ),
  ).toEqual(["name"]);
});

// Typesense defaults to <mark>, which a document can contain. With a fixed
// marker, a balanced pair in the document's own text read as a match the
// engine never made.
test("a document carrying a balanced marker pair cannot forge a match", () => {
  const parts =
    getHighlightsFromHit(
      getHit(`${MARKERS.open}shoe${MARKERS.close} and <mark>forged</mark>`),
      ["name"],
      MARKERS,
    ).name?.[0]?.parts ?? [];

  expect(parts.filter((part) => part.matched).map((part) => part.text)).toEqual(
    ["shoe"],
  );
  // The document's markup survives as ordinary text, because stripping it
  // would corrupt the document.
  expect(parts.map((part) => part.text).join("")).toBe(
    "shoe and <mark>forged</mark>",
  );
});

test("astral characters and combining marks stay whole", () => {
  const parts =
    getHighlightsFromHit(
      getHit(
        `\u{1F468}‍\u{1F469}‍\u{1F467} ${MARKERS.open}é${MARKERS.close}\u{1F1FA}\u{1F1E6} tail`,
      ),
      ["name"],
      MARKERS,
    ).name?.[0]?.parts ?? [];

  expect(parts).toEqual([
    { text: "\u{1F468}‍\u{1F469}‍\u{1F467} ", matched: false },
    { text: "é", matched: true },
    { text: "\u{1F1FA}\u{1F1E6} tail", matched: false },
  ]);
  // A cut inside a surrogate pair would leave a lone half here.
  expect([...(parts[0]?.text ?? "")]).toHaveLength(6);
  expect([...(parts[2]?.text ?? "")]).toHaveLength(7);
});

test("an unbalanced marker degrades to one unmatched part of plain text", () => {
  const getParts = (snippet: string) =>
    getHighlightsFromHit(getHit(snippet), ["name"], MARKERS).name?.[0]?.parts;

  expect(
    getParts(`a ${MARKERS.open}b${MARKERS.close} c ${MARKERS.open} d`),
  ).toEqual([{ text: "a b c  d", matched: false }]);
  expect(getParts(`${MARKERS.close}oops`)).toEqual([
    { text: "oops", matched: false },
  ]);
});

test("two entries for one field join into one list of fragments", () => {
  const hit = {
    document: { id: "1" },
    highlights: [
      { field: "name", snippet: `${MARKERS.open}a${MARKERS.close}` },
      { field: "name", snippet: `${MARKERS.open}b${MARKERS.close}` },
    ],
  };

  expect(getHighlightsFromHit(hit, ["name"], MARKERS).name).toHaveLength(2);
});
