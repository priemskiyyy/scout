import { expect, test } from "vitest";
import { assertUnreachable } from "src/utils/internal/assertUnreachable";

type Node = { type: "a" } | { type: "b"; value: number };

const dispatch = (node: Node): string => {
  if (node.type === "a") {
    return "a";
  }

  if (node.type === "b") {
    return `b${node.value}`;
  }

  return assertUnreachable(node);
};

// The union says what may arrive; untyped data from a provider is free to say
// something else, which is the only way this line is ever reached.
const forge = (json: string): Node => JSON.parse(json);

test("an exhausted dispatch still answers every declared variant", () => {
  expect(dispatch({ type: "a" })).toBe("a");
  expect(dispatch({ type: "b", value: 1 })).toBe("b1");
});

// [object Object] names no variant, and a filter AST node is always an object,
// so the message was useless in exactly the case it exists for.
test("an object variant is printed rather than stringified to [object Object]", () => {
  expect(() => dispatch(forge('{"type":"c","field":"price"}'))).toThrowError(
    'Unexpected value: {"type":"c","field":"price"}',
  );
});

test("a value JSON has no form for still throws a readable error", () => {
  const node = forge('{"type":"c"}');

  Object.defineProperty(node, "self", { value: node, enumerable: true });

  // JSON.stringify throws on a circular object rather than answering, so the
  // fallback is what keeps this a Scout error instead of a raw TypeError.
  expect(() => dispatch(node)).toThrowError(
    "Unexpected value: [object Object]",
  );
});

// A variant that arrives as undefined, which JSON has no string form for.
test("a value with no JSON form at all still names itself", () => {
  const name = (value: "a" | "b"): string => {
    if (value === "a") {
      return "a";
    }

    if (value === "b") {
      return "b";
    }

    return assertUnreachable(value);
  };

  const missing: "a" | "b" = JSON.parse("null") ?? undefined;

  expect(() => name(missing)).toThrowError("Unexpected value: undefined");
});
