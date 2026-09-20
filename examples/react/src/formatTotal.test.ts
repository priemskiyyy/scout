import { expect, test } from "vitest";
import { formatTotal } from "src/formatTotal";

test("an exact total is rendered as the number the engine counted", () => {
  expect(formatTotal({ value: 1, accuracy: "exact", scope: "matches" })).toBe(
    "1 result",
  );
  expect(
    formatTotal({ value: 1234, accuracy: "exact", scope: "matches" }),
  ).toBe("1,234 results");
});

test("an estimate says so instead of passing for a count", () => {
  expect(
    formatTotal({ value: 1234, accuracy: "estimated", scope: "matches" }),
  ).toBe("About 1,234 results");
});

test("a capped count keeps its lower bound", () => {
  expect(
    formatTotal({ value: 1000, accuracy: "lower-bound", scope: "matches" }),
  ).toBe("1,000+ results");
});

test("an engine that reported nothing renders no number at all", () => {
  const rendered = formatTotal({ accuracy: "unknown", scope: "unknown" });

  expect(rendered).toBe("An unknown number of results");
  expect(rendered).not.toMatch(/\d/);
});
