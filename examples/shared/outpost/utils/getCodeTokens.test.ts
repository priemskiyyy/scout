import { expect, test } from "vitest";

import { getCodeTokens } from "examples/shared/outpost/utils/getCodeTokens";

test("strings and calls are told apart, and nothing is lost", () => {
  const code = 'scout.index("api")\n  .search("tent (2)")';
  const tokens = getCodeTokens(code);

  expect(tokens.map((token) => token.text).join("")).toBe(code);
  expect(tokens.filter((token) => token.kind === "string")).toEqual([
    { text: '"api"', kind: "string" },
    { text: '"tent (2)"', kind: "string" },
  ]);
  expect(tokens.filter((token) => token.kind === "call")).toEqual([
    { text: ".index", kind: "call" },
    { text: ".search", kind: "call" },
  ]);
});

test("a quote escaped inside a string stays in the string", () => {
  expect(getCodeTokens('.search("a \\" b")')).toContainEqual({
    text: '"a \\" b"',
    kind: "string",
  });
});
