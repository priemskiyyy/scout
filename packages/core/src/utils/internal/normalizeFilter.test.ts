import { expect, test } from "vitest";
import { SearchConfigurationError } from "src/errors/SearchConfigurationError";
import type { FilterExpression } from "src/types/FilterExpression";
import { normalizeFilter } from "src/utils/internal/normalizeFilter";

const TRUE: FilterExpression = { type: "constant", value: true };
const FALSE: FilterExpression = { type: "constant", value: false };
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

test.each(["in", "not-in"] as const)(
  "%s refuses a non-array operand instead of treating it as an empty set",
  (operator) => {
    expect(() =>
      normalizeFilter({
        type: "comparison",
        field: "brand",
        operator,
        value: "Nike",
      }),
    ).toThrowError(SearchConfigurationError);
  },
);

test("a single child group collapses to the child", () => {
  expect(normalizeFilter({ type: "and", expressions: [a] })).toEqual(a);
  expect(normalizeFilter({ type: "or", expressions: [a] })).toEqual(a);
});

test("an empty conjunction restricts nothing and an empty disjunction admits nothing", () => {
  expect(normalizeFilter({ type: "and", expressions: [] })).toEqual(TRUE);
  expect(normalizeFilter({ type: "or", expressions: [] })).toEqual(FALSE);
});

test("a negated constant inverts", () => {
  expect(normalizeFilter({ type: "not", expression: TRUE })).toEqual(FALSE);
  expect(normalizeFilter({ type: "not", expression: FALSE })).toEqual(TRUE);
});

test("an empty in matches nothing and an empty notIn restricts nothing", () => {
  const empty = (operator: "in" | "not-in"): FilterExpression => ({
    type: "comparison",
    field: "brand",
    operator,
    value: [],
  });

  expect(normalizeFilter(empty("in"))).toEqual(FALSE);
  expect(normalizeFilter(empty("not-in"))).toEqual(TRUE);
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
  const withOrder = (values: readonly unknown[]): FilterExpression => ({
    type: "comparison",
    field: "brand",
    operator: "in",
    value: values,
  });

  expect(normalizeFilter(withOrder(["Sony", "Bose"]))).toEqual(
    normalizeFilter(withOrder(["Bose", "Sony"])),
  );
});

test("duplicate set operands collapse, but a string and a number do not", () => {
  const values = (input: readonly unknown[]): FilterExpression => ({
    type: "comparison",
    field: "size",
    operator: "in",
    value: input,
  });

  expect(normalizeFilter(values([1, 1, 2]))).toEqual(values([1, 2]));
  const mixed = normalizeFilter(values([1, "1"]));
  expect(mixed).toMatchObject({ type: "comparison" });
  expect(mixed.type === "comparison" && mixed.value).toHaveLength(2);
});

test("normalisation reaches all the way down a nested tree", () => {
  const nested: FilterExpression = {
    type: "and",
    expressions: [
      a,
      {
        type: "or",
        expressions: [
          { type: "and", expressions: [b] },
          { type: "comparison", field: "brand", operator: "in", value: [] },
        ],
      },
    ],
  };

  // The inner `or` holds a match-none, which an `or` ignores, so the group is
  // just its remaining branch.
  expect(normalizeFilter(nested)).toEqual({ type: "and", expressions: [a, b] });
});

test("normalising an already normal tree changes nothing", () => {
  const trees: readonly FilterExpression[] = [
    a,
    TRUE,
    FALSE,
    { type: "and", expressions: [a, b] },
    { type: "or", expressions: [a, { type: "not", expression: b }] },
    { type: "comparison", field: "brand", operator: "in", value: ["a", "b"] },
  ];

  for (const tree of trees) {
    const once = normalizeFilter(tree);
    expect(normalizeFilter(once)).toEqual(once);
  }
});

// No engine has a literal true or false to write down, so a constant left
// inside a group would have to be absorbed by every adapter separately. Three
// of them did it independently and one got it wrong, narrowing an `or`. The
// rule lives here instead.
test("a constant decides the group it can decide", () => {
  expect(normalizeFilter({ type: "and", expressions: [a, FALSE] })).toEqual(
    FALSE,
  );
  expect(normalizeFilter({ type: "or", expressions: [a, TRUE] })).toEqual(TRUE);
});

test.each(["and", "or"] as const)(
  "%s still refuses an invalid operand after a deciding constant",
  (type) => {
    expect(() =>
      normalizeFilter({
        type,
        expressions: [
          { type: "constant", value: type === "or" },
          { type: "comparison", field: "price", operator: "eq", value: NaN },
        ],
      }),
    ).toThrowError(SearchConfigurationError);
  },
);

test("a constant the group ignores disappears from it", () => {
  expect(normalizeFilter({ type: "and", expressions: [a, TRUE] })).toEqual(a);
  expect(normalizeFilter({ type: "or", expressions: [a, FALSE] })).toEqual(a);
  expect(normalizeFilter({ type: "and", expressions: [a, b, TRUE] })).toEqual({
    type: "and",
    expressions: [a, b],
  });
});

test("a group of nothing but neutral constants means what they meant", () => {
  expect(normalizeFilter({ type: "and", expressions: [TRUE, TRUE] })).toEqual(
    TRUE,
  );
  expect(normalizeFilter({ type: "or", expressions: [FALSE, FALSE] })).toEqual(
    FALSE,
  );
});

// An empty notIn is match-all, so this `or` really does mean everything. An
// adapter that dropped the constant would silently narrow it to the brand.
test("an empty notIn beside a real filter widens the or, as it means", () => {
  const tree: FilterExpression = {
    type: "or",
    expressions: [
      { type: "comparison", field: "brand", operator: "eq", value: "Nike" },
      { type: "comparison", field: "tags", operator: "not-in", value: [] },
    ],
  };

  expect(normalizeFilter(tree)).toEqual(TRUE);
});
