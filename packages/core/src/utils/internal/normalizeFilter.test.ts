import { expect, test } from "vitest";

import type { FilterExpression } from "src/types/FilterExpression";
import type { FilterValue } from "src/types/FilterValue";
import { normalizeFilter } from "src/utils/internal/normalizeFilter";

// The filters that mean a constant: one matches nothing, one restricts nothing.
const NOTHING: FilterExpression = {
  type: "comparison",
  field: "brand",
  operator: "in",
  value: [],
};

const EVERYTHING: FilterExpression = {
  type: "comparison",
  field: "brand",
  operator: "not-in",
  value: [],
};

const a: FilterExpression = {
  type: "comparison",
  field: "a",
  operator: "eq",
  value: 1,
};

const b: FilterExpression = {
  type: "comparison",
  field: "b",
  operator: "eq",
  value: 2,
};

const c: FilterExpression = {
  type: "comparison",
  field: "c",
  operator: "eq",
  value: 3,
};

const getSet = (values: readonly FilterValue[]): FilterExpression => ({
  type: "comparison",
  field: "brand",
  operator: "in",
  value: values,
});

test("an empty in matches nothing and an empty notIn restricts nothing", () => {
  expect(normalizeFilter(NOTHING)).toBe(false);
  expect(normalizeFilter(EVERYTHING)).toBe(true);
});

test("an empty conjunction restricts nothing and an empty disjunction admits nothing", () => {
  expect(normalizeFilter({ type: "and", expressions: [] })).toBe(true);
  expect(normalizeFilter({ type: "or", expressions: [] })).toBe(false);
});

test("a negated constant inverts", () => {
  expect(normalizeFilter({ type: "not", expression: EVERYTHING })).toBe(false);
  expect(normalizeFilter({ type: "not", expression: NOTHING })).toBe(true);
});

test("a single child group collapses to the child", () => {
  expect(normalizeFilter({ type: "and", expressions: [a] })).toEqual(a);
  expect(normalizeFilter({ type: "or", expressions: [a] })).toEqual(a);
});

test("groups of the same kind flatten", () => {
  expect(
    normalizeFilter({
      type: "and",
      expressions: [a, { type: "and", expressions: [b, c] }],
    }),
  ).toEqual({ type: "and", expressions: [a, b, c] });
  expect(
    normalizeFilter({
      type: "or",
      expressions: [a, { type: "or", expressions: [b, c] }],
    }),
  ).toEqual({ type: "or", expressions: [a, b, c] });
});

test("a group of the other kind is left alone", () => {
  const mixed: FilterExpression = {
    type: "and",
    expressions: [a, { type: "or", expressions: [b, c] }],
  };

  expect(normalizeFilter(mixed)).toEqual(mixed);
});

test("set operands that differ only in order share one normal form", () => {
  expect(normalizeFilter(getSet(["Sony", "Bose"]))).toEqual(
    normalizeFilter(getSet(["Bose", "Sony"])),
  );
});

test("duplicate set operands collapse, but a string and a number do not", () => {
  expect(normalizeFilter(getSet([1, 1, 2]))).toEqual(getSet([1, 2]));
  // Canonically a string sorts before a number, and neither absorbs the other.
  expect(normalizeFilter(getSet([1, "1"]))).toEqual(getSet(["1", 1]));
});

// No engine has a literal true or false to write down, so a constant left in
// a group would have to be absorbed by every adapter separately. Three did it
// independently and one got it wrong, narrowing an or.
test("a constant decides the group it can decide", () => {
  expect(normalizeFilter({ type: "and", expressions: [a, NOTHING] })).toBe(
    false,
  );
  expect(normalizeFilter({ type: "or", expressions: [a, EVERYTHING] })).toBe(
    true,
  );
});

test("a constant the group ignores disappears from it", () => {
  expect(
    normalizeFilter({ type: "and", expressions: [a, EVERYTHING] }),
  ).toEqual(a);
  expect(normalizeFilter({ type: "or", expressions: [a, NOTHING] })).toEqual(a);
  expect(
    normalizeFilter({ type: "and", expressions: [a, b, EVERYTHING] }),
  ).toEqual({ type: "and", expressions: [a, b] });
});

test("a group of nothing but neutral constants means what they meant", () => {
  expect(
    normalizeFilter({ type: "and", expressions: [EVERYTHING, EVERYTHING] }),
  ).toBe(true);
  expect(normalizeFilter({ type: "or", expressions: [NOTHING, NOTHING] })).toBe(
    false,
  );
});

test.each([
  ["and", NOTHING],
  ["or", EVERYTHING],
] satisfies ["and" | "or", FilterExpression][])(
  "%s still refuses an invalid operand after a deciding constant",
  (type, deciding) => {
    expect(() =>
      normalizeFilter({
        type,
        expressions: [
          deciding,
          { type: "comparison", field: "price", operator: "eq", value: NaN },
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: "configuration" }));
  },
);

test("normalisation reaches all the way down a nested tree", () => {
  const nested: FilterExpression = {
    type: "and",
    expressions: [
      a,
      {
        type: "or",
        expressions: [{ type: "and", expressions: [b] }, NOTHING],
      },
    ],
  };

  // The inner or holds a match-nothing, which an or ignores, so the group is
  // just its remaining branch.
  expect(normalizeFilter(nested)).toEqual({ type: "and", expressions: [a, b] });
});

test("normalising an already normal tree changes nothing", () => {
  const trees: readonly FilterExpression[] = [
    a,
    { type: "and", expressions: [a, b] },
    { type: "or", expressions: [a, { type: "not", expression: b }] },
    getSet(["a", "b"]),
  ];

  for (const tree of trees) {
    expect(normalizeFilter(tree)).toEqual(tree);
  }
});
