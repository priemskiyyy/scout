import { ScoutError } from "@priemskiyyy/scout";
import type {
  FilterComparison,
  FilterExpression,
  FilterValue,
} from "@priemskiyyy/scout";

import { assertUnreachable } from "src/utils/assertUnreachable";
import { FIELD_PATTERN, RANGE_SYMBOLS } from "src/utils/constants/filters";

// Meilisearch reads a double quoted string with backslash escapes. The
// backslashes go first, or the one added for a quote would be doubled.
const getValue = (value: FilterValue): string => {
  if (typeof value === "string") {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }

  return String(value);
};

const getComparison = (comparison: FilterComparison): string => {
  const { field } = comparison;

  if (!FIELD_PATTERN.test(field)) {
    throw new ScoutError({
      code: "configuration",
      message:
        `Meilisearch cannot filter on ${JSON.stringify(field)}: an attribute ` +
        `is letters, digits, underscores, dots and dashes.`,
    });
  }

  if (comparison.operator === "eq") {
    return `${field} = ${getValue(comparison.value)}`;
  }

  if (comparison.operator === "neq") {
    return `${field} != ${getValue(comparison.value)}`;
  }

  if (comparison.operator === "in") {
    return `${field} IN [${comparison.value.map(getValue).join(", ")}]`;
  }

  if (comparison.operator === "not-in") {
    return `${field} NOT IN [${comparison.value.map(getValue).join(", ")}]`;
  }

  if (comparison.operator === "between") {
    const [min, max] = comparison.value;

    return `${field} ${min} TO ${max}`;
  }

  if (
    comparison.operator === "gt" ||
    comparison.operator === "gte" ||
    comparison.operator === "lt" ||
    comparison.operator === "lte"
  ) {
    return `${field} ${RANGE_SYMBOLS[comparison.operator]} ${comparison.value}`;
  }

  return assertUnreachable(comparison.operator);
};

/**
 * One Meilisearch filter string for a normalised filter. Every member of a
 * group is parenthesised, so precedence is the tree's and never the parser's.
 *
 * @example
 * ```ts
 * getFilterFromFilter({ type: "comparison", field: "brand", operator: "eq", value: "Acme" });
 * // 'brand = "Acme"'
 * ```
 */
export const getFilterFromFilter = (expression: FilterExpression): string => {
  if (expression.type === "comparison") {
    return getComparison(expression);
  }

  if (expression.type === "not") {
    return `NOT (${getFilterFromFilter(expression.expression)})`;
  }

  if (expression.type === "and") {
    return expression.expressions
      .map((member) => `(${getFilterFromFilter(member)})`)
      .join(" AND ");
  }

  if (expression.type === "or") {
    return expression.expressions
      .map((member) => `(${getFilterFromFilter(member)})`)
      .join(" OR ");
  }

  return assertUnreachable(expression);
};
