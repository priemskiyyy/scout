import { expect, test } from "vitest";
import { canonicalize } from "src/utils/internal/canonicalize";

const CONFIGURATION = expect.objectContaining({ code: "configuration" });

test("key order does not change the identity", () => {
  expect(canonicalize({ b: 1, a: 2 }, "p")).toBe(
    canonicalize({ a: 2, b: 1 }, "p"),
  );
});

test("array order does change the identity, because order is meaning", () => {
  expect(canonicalize([1, 2], "p")).not.toBe(canonicalize([2, 1], "p"));
});

test("an absent member and an undefined member share an identity", () => {
  expect(canonicalize({ a: 1 }, "p")).toBe(
    canonicalize({ a: 1, b: undefined }, "p"),
  );
});

test("negative zero collapses into zero, so two equal pages share a cache entry", () => {
  expect(canonicalize(-0, "p")).toBe(canonicalize(0, "p"));
});

// Two filters on different fields can carry values of different types. If those
// values shared a canonical form, the two searches would share a cache entry.
test("values of different types never share a canonical form", () => {
  const forms = [true, false, 1, 0, "1", "0", "true", null].map((value) =>
    canonicalize(value, "p"),
  );

  expect(new Set(forms).size).toBe(forms.length);
});

test("a Date is its ISO string", () => {
  expect(canonicalize(new Date("2026-09-20T00:00:00.000Z"), "p")).toBe(
    '"2026-09-20T00:00:00.000Z"',
  );
});

test("nesting is canonical all the way down", () => {
  const left = canonicalize({ outer: { b: [1, { d: 4, c: 3 }], a: 1 } }, "p");
  const right = canonicalize({ outer: { a: 1, b: [1, { c: 3, d: 4 }] } }, "p");

  expect(left).toBe(right);
});

const unserialisable: readonly [string, unknown][] = [
  ["a function", () => undefined],
  ["a symbol", Symbol("x")],
  ["NaN", Number.NaN],
  ["an infinite number", Number.POSITIVE_INFINITY],
  ["an invalid Date", new Date("nonsense")],
  ["a class instance", new (class Client {})()],
];

for (const [what, value] of unserialisable) {
  test(`${what} is refused rather than dropped, naming the path`, () => {
    const call = () => canonicalize({ nested: value }, "provider");

    expect(call).toThrowError(CONFIGURATION);
    expect(call).toThrowError(/provider\.nested/);
  });
}

// An object member and an array element mean different things. A missing member
// is the same as no member, so it is omitted; a missing element is a hole in a
// sequence, so it is refused.
test("an undefined member is omitted, while an undefined element is refused", () => {
  expect(canonicalize({ a: undefined }, "p")).toBe("{}");
  expect(() => canonicalize([undefined], "p")).toThrowError(CONFIGURATION);
  expect(() => canonicalize(undefined, "p")).toThrowError(CONFIGURATION);
});

test("a refusal names the position inside an array", () => {
  const call = () => canonicalize([1, Number.NaN], "provider");

  expect(call).toThrowError(/provider\[1\]/);
});

test("a sparse array cannot collide with an empty array", () => {
  expect(() => canonicalize(new Array(1), "provider")).toThrowError(
    CONFIGURATION,
  );
});

test("a cyclic option is refused with its path instead of overflowing the stack", () => {
  const value: Record<string, unknown> = {};

  value.self = value;

  expect(() => canonicalize(value, "provider")).toThrowError(CONFIGURATION);
  expect(() => canonicalize(value, "provider")).toThrowError("provider.self");
});

// Reading `value.constructor.name` throws a raw TypeError on an object whose
// own prototype has a null prototype, which replaced Scout's explanation with
// the provider option's stack.
test("an object with no constructor to name is still refused with an explanation", () => {
  const exotic = Object.create(Object.create(null));

  expect(() => canonicalize(exotic, "provider")).toThrowError(CONFIGURATION);
  expect(() => canonicalize(exotic, "provider")).toThrowError(
    "provider is an instance of an unnamed type",
  );
});
