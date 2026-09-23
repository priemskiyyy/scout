import type { FilterComparison } from "src/types/FilterComparison";
import type { FilterExpression } from "src/types/FilterExpression";
import { assertUnreachable } from "src/utils/internal/assertUnreachable";
import { getOwnValue } from "src/utils/internal/getOwnValue";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// An array field matches when any of its elements does.
const matchesAnyValue = (
  actual: unknown,
  test: (candidate: unknown) => boolean,
): boolean => {
  if (Array.isArray(actual)) {
    return actual.some(test);
  }

  return test(actual);
};

// Only two numbers or two strings have an order; anything else has none.
const compareOrder = (left: unknown, right: unknown): -1 | 0 | 1 | null => {
  const comparable =
    (typeof left === "number" && typeof right === "number") ||
    (typeof left === "string" && typeof right === "string");

  if (!comparable || Number.isNaN(left) || Number.isNaN(right)) {
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

const isAtLeast = (candidate: unknown, bound: unknown): boolean => {
  const compared = compareOrder(candidate, bound);

  return compared !== null && compared >= 0;
};

const isAtMost = (candidate: unknown, bound: unknown): boolean => {
  const compared = compareOrder(candidate, bound);

  return compared !== null && compared <= 0;
};

// A document that is not a record has no fields, and an inherited property
// is not one of them.
const getFieldValue = (document: unknown, field: string): unknown => {
  if (!isRecord(document)) {
    return undefined;
  }

  return getOwnValue(document, field);
};

const matchesComparison = (
  document: unknown,
  node: FilterComparison,
): boolean => {
  const actual = getFieldValue(document, node.field);

  if (node.operator === "eq") {
    return matchesAnyValue(actual, (candidate) => candidate === node.value);
  }

  if (node.operator === "neq") {
    return !matchesAnyValue(actual, (candidate) => candidate === node.value);
  }

  if (node.operator === "in") {
    return node.value.some((value) =>
      matchesAnyValue(actual, (candidate) => candidate === value),
    );
  }

  if (node.operator === "not-in") {
    return !node.value.some((value) =>
      matchesAnyValue(actual, (candidate) => candidate === value),
    );
  }

  if (node.operator === "gt") {
    return matchesAnyValue(
      actual,
      (candidate) => compareOrder(candidate, node.value) === 1,
    );
  }

  if (node.operator === "gte") {
    return matchesAnyValue(actual, (candidate) =>
      isAtLeast(candidate, node.value),
    );
  }

  if (node.operator === "lt") {
    return matchesAnyValue(
      actual,
      (candidate) => compareOrder(candidate, node.value) === -1,
    );
  }

  if (node.operator === "lte") {
    return matchesAnyValue(actual, (candidate) =>
      isAtMost(candidate, node.value),
    );
  }

  if (node.operator === "between") {
    // Inclusive at both ends.
    const [min, max] = node.value;

    return matchesAnyValue(
      actual,
      (candidate) => isAtLeast(candidate, min) && isAtMost(candidate, max),
    );
  }

  return assertUnreachable(node.operator);
};

/**
 * Evaluates a request's filter against one complete document; `null` matches
 * everything. An in-process adapter runs it over the whole match set before
 * paginating, so counts stay exact. Never use it to filter a page a remote
 * engine returned.
 *
 * @example
 * ```ts
 * const matches = results.filter((result) => matchesFilter(request.filter, result.item));
 * ```
 */
export const matchesFilter = (
  expression: FilterExpression | null,
  document: unknown,
): boolean => {
  if (expression === null) {
    return true;
  }

  if (expression.type === "comparison") {
    return matchesComparison(document, expression);
  }

  if (expression.type === "not") {
    return !matchesFilter(expression.expression, document);
  }

  if (expression.type === "and") {
    return expression.expressions.every((member) =>
      matchesFilter(member, document),
    );
  }

  if (expression.type === "or") {
    return expression.expressions.some((member) =>
      matchesFilter(member, document),
    );
  }

  return assertUnreachable(expression);
};
