import { afterEach, expect, test, vi } from "vitest";
import { createHighlightMarkers } from "src/utils/createHighlightMarkers";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("every search gets its own pair, so a corpus cannot be written to match one", () => {
  const first = createHighlightMarkers();
  const second = createHighlightMarkers();

  expect(first.open).not.toBe(second.open);
  expect(first.close).not.toBe(second.close);
});

test("the pair is distinguishable and carries the label", () => {
  const markers = createHighlightMarkers("acme");

  expect(markers.open).not.toBe(markers.close);
  expect(markers.open.startsWith("[acme:")).toBe(true);
  expect(markers.close.startsWith("[/acme:")).toBe(true);
});

// Older Hermes builds have no crypto.randomUUID, and a React Native
// application that lost its markers there would fall back to the engine's own
// <mark>, which is exactly the forgeable marker this function exists to avoid.
test("a runtime without crypto.randomUUID still gets an unguessable pair", () => {
  vi.stubGlobal("crypto", {});

  const first = createHighlightMarkers();
  const second = createHighlightMarkers();

  expect(first.open.length).toBeGreaterThan("[scout:]".length);
  expect(first.open).not.toBe(second.open);
});
