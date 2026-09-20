import { expect, test } from "vitest";
import { splitHighlight } from "src/utils/splitHighlight";

const MARKERS = { open: "[o]", close: "[c]" };

const rejoin = (value: string) =>
  splitHighlight(value, MARKERS)
    .map((part) => part.text)
    .join("");

test("a marked value splits into alternating unmatched and matched runs", () => {
  expect(splitHighlight("a [o]b[c] c [o]d[c]", MARKERS)).toEqual([
    { text: "a ", matched: false },
    { text: "b", matched: true },
    { text: " c ", matched: false },
    { text: "d", matched: true },
  ]);
});

// One degradation rule, because three adapters had three of them. Anything
// that does not read as balanced, non-nested pairs is one unmatched part.
test("an open that never closes degrades to plain text", () => {
  expect(splitHighlight("a [o]b[c] c [o] d", MARKERS)).toEqual([
    { text: "a b c  d", matched: false },
  ]);
});

test("a close with no open degrades to plain text", () => {
  expect(splitHighlight("[c]oops", MARKERS)).toEqual([
    { text: "oops", matched: false },
  ]);
});

test("a nested pair degrades to plain text", () => {
  expect(splitHighlight("[o]a[o]b[c]c[c]", MARKERS)).toEqual([
    { text: "abc", matched: false },
  ]);
});

test("an empty value is one empty unmatched part", () => {
  expect(splitHighlight("", MARKERS)).toEqual([{ text: "", matched: false }]);
});

// An empty marker matches at every position, which is a scan that never
// advances rather than a wrong answer.
test("an empty marker degrades instead of hanging", () => {
  expect(splitHighlight("a b", { open: "", close: "" })).toEqual([
    { text: "a b", matched: false },
  ]);
});

test("no part ever carries a marker, so a document cannot render as markup", () => {
  const parts = splitHighlight("[o]shoe[c] <img onerror=x> [c]", MARKERS);

  for (const part of parts) {
    expect(part.text.includes(MARKERS.open)).toBe(false);
    expect(part.text.includes(MARKERS.close)).toBe(false);
  }
  expect(parts).toEqual([{ text: "shoe <img onerror=x> ", matched: false }]);
});

// Slicing at a marker boundary must never cut a character in half. The parts
// rejoining to exactly the value without its markers is the invariant, and it
// catches a corrupted slice and a leaked marker at once.
test("slicing is code point safe", () => {
  const cases = [
    // A combining acute accent, which is its own code point.
    "café [o]noiŕ[c] eté",
    // CJK, three bytes per character in UTF-8 and one code unit in UTF-16.
    "東京 [o]ラーメン[c] 店",
    // An astral plane emoji, a surrogate pair in UTF-16.
    "grin \u{1F600} [o]\u{1F600}\u{1F601}[c] end \u{1F602}",
    // A ZWJ family sequence, several code points joined into one grapheme.
    "family \u{1F468}‍\u{1F469}‍\u{1F467} [o]\u{1F468}‍\u{1F469}‍\u{1F467}[c]",
  ];

  for (const value of cases) {
    const stripped = value
      .split(MARKERS.open)
      .join("")
      .split(MARKERS.close)
      .join("");
    expect(rejoin(value)).toBe(stripped);
    expect([...rejoin(value)]).toEqual([...stripped]);
  }
});

test("a match made of astral characters comes back whole", () => {
  expect(splitHighlight("a[o]\u{1F600}\u{1F601}[c]b", MARKERS)).toEqual([
    { text: "a", matched: false },
    { text: "\u{1F600}\u{1F601}", matched: true },
    { text: "b", matched: false },
  ]);
});
