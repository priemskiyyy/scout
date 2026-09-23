import { expect, test } from "vitest";

import type { FacetValueType } from "src/types/FacetValueType";
import { decodeFacetValue } from "src/utils/internal/decodeFacetValue";

const decode = (type: FacetValueType, value: unknown) =>
  decodeFacetValue({ adapter: "engine", field: "field", type, value });

test.each([
  ["string", "Nike", "Nike"],
  ["string", 12, "12"],
  ["string", true, "true"],
  ["number", 12.5, 12.5],
  ["number", "12.5", 12.5],
  ["number", "-3", -3],
  ["boolean", true, true],
  ["boolean", "true", true],
  ["boolean", "false", false],
] satisfies [FacetValueType, unknown, unknown][])(
  "a %s facet reads %j as %j",
  (type, value, decoded) => {
    expect(decode(type, value)).toBe(decoded);
  },
);

test.each([
  ["string", null],
  ["string", { name: "Nike" }],
  ["number", ""],
  ["number", " "],
  ["number", "cheap"],
  ["number", Number.NaN],
  ["number", "Infinity"],
  ["boolean", "yes"],
  ["boolean", 1],
] satisfies [FacetValueType, unknown][])(
  "a %s facet refuses %j",
  (type, value) => {
    expect(() => decode(type, value)).toThrowError(
      expect.objectContaining({ code: "provider" }),
    );
  },
);
