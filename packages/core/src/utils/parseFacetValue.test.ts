import { expect, test } from "vitest";
import { SearchProviderError } from "src/errors/SearchProviderError";
import { parseFacetValue } from "src/utils/parseFacetValue";

test("numeric facet labels are decoded without changing string labels", () => {
  expect(
    parseFacetValue({
      adapter: "test",
      field: "price",
      type: "number",
      value: "12.5",
    }),
  ).toBe(12.5);
  expect(
    parseFacetValue({
      adapter: "test",
      field: "code",
      type: "string",
      value: "0012",
    }),
  ).toBe("0012");
});

test.each(["true", "false"])("boolean facet %s is decoded", (value) => {
  expect(
    parseFacetValue({
      adapter: "test",
      field: "available",
      type: "boolean",
      value,
    }),
  ).toBe(value === "true");
});

test.each(["", " ", "NaN", "Infinity", "not a number"])(
  "malformed numeric facet %j rejects rather than violating the declared type",
  (value) => {
    expect(() =>
      parseFacetValue({
        adapter: "test",
        field: "price",
        type: "number",
        value,
      }),
    ).toThrow(SearchProviderError);
  },
);

test("a malformed boolean facet is not returned as a string", () => {
  expect(() =>
    parseFacetValue({
      adapter: "test",
      field: "available",
      type: "boolean",
      value: "maybe",
    }),
  ).toThrow(SearchProviderError);
});
