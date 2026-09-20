import type { FilterExpression } from "src/types/FilterExpression";
import { assertUnreachable } from "src/utils/assertUnreachable";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Array fields match when any element satisfies the operator. */
const holds = (
  actual: unknown,
  test: (candidate: unknown) => boolean,
): boolean => {
  if (Array.isArray(actual)) {
    return actual.some(test);
  }
  return test(actual);
};

const order = (left: unknown, right: unknown): -1 | 0 | 1 | null => {
  if (!(
    (typeof left === "number" && typeof right === "number") ||
    (typeof left === "string" && typeof right === "string")
  )) {
    return null;
  }
  if (Number.isNaN(left) || Number.isNaN(right)) {
    return null;
  }
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
};

const atLeast = (candidate: unknown, bound: unknown): boolean => {
  const compared = order(candidate, bound);
  return compared !== null && compared >= 0;
};

const atMost = (candidate: unknown, bound: unknown): boolean => {
  const compared = order(candidate, bound);
  return compared !== null && compared <= 0;
};

const matchesComparison = (
  document: unknown,
  node: Extract<FilterExpression, { type: "comparison" }>,
): boolean => {
  const actual = isRecord(document) ? document[node.field] : undefined;
  const values = Array.isArray(node.value) ? node.value : [];

  if (node.operator === "eq") {
    return holds(actual, (candidate) => candidate === node.value);
  }
  if (node.operator === "neq") {
    return !holds(actual, (candidate) => candidate === node.value);
  }
  if (node.operator === "in") {
    return values.some((value) =>
      holds(actual, (candidate) => candidate === value),
    );
  }
  if (node.operator === "not-in") {
    return !values.some((value) =>
      holds(actual, (candidate) => candidate === value),
    );
  }
  if (node.operator === "gt") {
    return holds(actual, (candidate) => order(candidate, node.value) === 1);
  }
  if (node.operator === "gte") {
    return holds(actual, (candidate) => atLeast(candidate, node.value));
  }
  if (node.operator === "lt") {
    return holds(actual, (candidate) => order(candidate, node.value) === -1);
  }
  if (node.operator === "lte") {
    return holds(actual, (candidate) => atMost(candidate, node.value));
  }
  if (node.operator === "between") {
    // The builder emits `[min, max]`, inclusive at both ends.
    const [min, max] = values;
    return holds(
      actual,
      (candidate) => atLeast(candidate, min) && atMost(candidate, max),
    );
  }
  return assertUnreachable(node.operator);
};

/**
 * Evaluates a portable filter against one complete document. Local adapters
 * use this over the full match set before pagination, so counts stay exact.
 * Never use it to filter a page returned by a remote engine.
 *
 * @example
 * ```ts
 * const filtered = allMatches.filter((hit) => matchesFilter(request.filter, hit.item));
 * ```
 */
export const matchesFilter = (
  expression: FilterExpression,
  document: unknown,
): boolean => {
  if (expression.type === "constant") {
    return expression.value;
  }
  if (expression.type === "comparison") {
    return matchesComparison(document, expression);
  }
  if (expression.type === "not") {
    return !matchesFilter(expression.expression, document);
  }
  if (expression.type === "and") {
    return expression.expressions.every((child) =>
      matchesFilter(child, document),
    );
  }
  if (expression.type === "or") {
    return expression.expressions.some((child) =>
      matchesFilter(child, document),
    );
  }
  return assertUnreachable(expression);
};
