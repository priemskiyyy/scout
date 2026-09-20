import type { FilterExpression } from "src/types/FilterExpression";
import { SearchConfigurationError } from "src/errors/SearchConfigurationError";
import { MATCH_ALL, MATCH_NONE } from "src/utils/constants/filterConstants";
import { assertUnreachable } from "src/utils/assertUnreachable";
import { canonicalize } from "src/utils/internal/canonicalize";

const SET_OPERATORS = ["in", "not-in"];

const canonicalSet = (values: readonly unknown[], field: string) => {
  // Canonical keys distinguish mixed types, such as 1 and "1".
  const seen = new Map<string, unknown>();
  for (const value of values) {
    const key = canonicalize(value, field);
    if (seen.has(key)) {
      continue;
    }
    seen.set(key, value);
  }
  return [...seen.keys()].sort().map((key) => seen.get(key));
};

/**
 * Normalises constants, groups and set operands for adapter dispatch and
 * query identity. Preserves comparison order and validates every operand,
 * even when a constant already determines the group's result.
 *
 * @example
 * ```ts
 * normalizeFilter({ type: "and", expressions: [] }); // matches everything
 * ```
 */
export const normalizeFilter = (
  expression: FilterExpression,
): FilterExpression => {
  if (expression.type === "constant") {
    return expression;
  }

  if (expression.type === "comparison") {
    if (!SET_OPERATORS.includes(expression.operator)) {
      // Reject operands that cannot participate in query identity.
      canonicalize(expression.value, expression.field);
      return expression;
    }
    if (!Array.isArray(expression.value)) {
      throw new SearchConfigurationError({
        path: expression.field,
        message: `The ${expression.operator} filter on ${expression.field} requires an array.`,
      });
    }
    if (expression.value.length === 0) {
      // An empty set matches nothing, and its negation restricts nothing.
      return expression.operator === "in" ? MATCH_NONE : MATCH_ALL;
    }
    return {
      ...expression,
      value: canonicalSet(expression.value, expression.field),
    };
  }

  if (expression.type === "not") {
    const inner = normalizeFilter(expression.expression);
    if (inner.type === "constant") {
      return inner.value ? MATCH_NONE : MATCH_ALL;
    }
    return { type: "not", expression: inner };
  }

  if (expression.type === "and" || expression.type === "or") {
    // A constant either decides its group or disappears from it. `and` is
    // decided by false and unaffected by true; `or` is the other way round.
    const decides = expression.type === "or";
    let decided = false;
    const remaining: FilterExpression[] = [];
    for (const expressionChild of expression.expressions) {
      // Visit every child even after a deciding constant: invalid operands
      // still need to be refused before a request can reach an adapter.
      const child = normalizeFilter(expressionChild);
      if (child.type === "constant") {
        if (child.value === decides) {
          decided = true;
        }
        continue;
      }
      if (child.type === expression.type) {
        for (const nested of child.expressions) {
          remaining.push(nested);
        }
        continue;
      }
      remaining.push(child);
    }
    if (decided) {
      return decides ? MATCH_ALL : MATCH_NONE;
    }
    if (remaining.length === 1 && typeof remaining[0] !== "undefined") {
      return remaining[0];
    }
    if (remaining.length > 1) {
      return { type: expression.type, expressions: remaining };
    }
    // Empty groups resolve to their neutral constant.
    return decides ? MATCH_NONE : MATCH_ALL;
  }

  return assertUnreachable(expression);
};
