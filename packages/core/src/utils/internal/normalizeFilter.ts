import type { FilterExpression } from "src/types/FilterExpression";
import type { FilterValue } from "src/types/FilterValue";
import { assertUnreachable } from "src/utils/internal/assertUnreachable";
import { canonicalize } from "src/utils/internal/canonicalize";

// The order of the canonical keys, which is the default string order.
const compareKeys = (
  [left]: readonly [string, FilterValue],
  [right]: readonly [string, FilterValue],
) => {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
};

const getCanonicalSet = (
  values: readonly FilterValue[],
  field: string,
): readonly FilterValue[] => {
  // Canonical keys distinguish mixed types, such as 1 and "1".
  const seen = new Map<string, FilterValue>();

  for (const value of values) {
    const key = canonicalize(value, field);

    if (seen.has(key)) {
      continue;
    }

    seen.set(key, value);
  }

  return [...seen.entries()].sort(compareKeys).map(([, value]) => value);
};

/**
 * Normalises a filter for dispatch and for query identity: `true` when it
 * restricts nothing, `false` when it matches nothing, and otherwise a tree
 * with no constant left in it, flattened groups and sorted, deduplicated set
 * operands. Comparison order is preserved, and every operand is validated,
 * even one a constant has already outvoted.
 *
 * @example
 * ```ts
 * normalizeFilter({ type: "and", expressions: [] }); // true
 * ```
 */
export const normalizeFilter = (
  expression: FilterExpression,
): FilterExpression | boolean => {
  if (expression.type === "comparison") {
    if (expression.operator !== "in" && expression.operator !== "not-in") {
      // Reject operands that cannot participate in query identity.
      canonicalize(expression.value, expression.field);

      return expression;
    }

    // An empty set matches nothing, and its negation restricts nothing.
    if (expression.value.length === 0) {
      return expression.operator === "not-in";
    }

    return {
      ...expression,
      value: getCanonicalSet(expression.value, expression.field),
    };
  }

  if (expression.type === "not") {
    const inner = normalizeFilter(expression.expression);

    if (typeof inner === "boolean") {
      return !inner;
    }

    return { type: "not", expression: inner };
  }

  if (expression.type === "and" || expression.type === "or") {
    // A constant either decides its group or disappears from it. `and` is
    // decided by false and unaffected by true; `or` is the other way round.
    const decides = expression.type === "or";
    let decided = false;
    const remaining: FilterExpression[] = [];

    for (const member of expression.expressions) {
      // Visit every member even after a deciding constant: invalid operands
      // still need to be refused before a request can reach an adapter.
      const normalized = normalizeFilter(member);

      if (typeof normalized === "boolean") {
        if (normalized === decides) {
          decided = true;
        }

        continue;
      }

      if (normalized.type === expression.type) {
        remaining.push(...normalized.expressions);

        continue;
      }

      remaining.push(normalized);
    }

    if (decided) {
      return decides;
    }

    const [only] = remaining;

    if (remaining.length === 1 && only !== undefined) {
      return only;
    }

    if (remaining.length > 1) {
      return { type: expression.type, expressions: remaining };
    }

    // An empty group means its neutral constant.
    return !decides;
  }

  return assertUnreachable(expression);
};
