import { expect, test } from "vitest";

import { getOrderOfValues } from "src/utils/getOrderOfValues";

test("numbers order by value", () => {
  expect(getOrderOfValues(90, 140)).toBeLessThan(0);
  expect(getOrderOfValues(140, 90)).toBeGreaterThan(0);
  expect(getOrderOfValues(90, 90)).toBe(0);
});

test("false comes before true", () => {
  expect(getOrderOfValues(false, true)).toBeLessThan(0);
  expect(getOrderOfValues(true, false)).toBeGreaterThan(0);
});

// A locale would put "a" before "B". Code units put "B" first everywhere.
test("strings order by code unit, never by the runtime's locale", () => {
  expect(getOrderOfValues("B", "a")).toBe(-1);
  expect(getOrderOfValues("a", "B")).toBe(1);
  expect(getOrderOfValues("shoe", "shoe")).toBe(0);
});

test("values of different types are a tie", () => {
  expect(getOrderOfValues(1, "1")).toBe(0);
  expect(getOrderOfValues(null, 1)).toBe(0);
});
