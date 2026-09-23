import type {
  FilterComparison,
  FilterExpression,
  FilterValue,
} from "@priemskiyyy/scout";

import { assertUnreachable } from "src/utils/assertUnreachable";
import { FILTER_JOINERS } from "src/utils/constants/filters";

// Typesense reads a backtick quoted value literally, so only a backtick and a
// backslash are escaped. A comma, a bracket, `&&`, `||` and any Unicode are
// already inert inside one.
const getValue = (value: FilterValue): string => {
  if (typeof value === "string") {
    return `\`${value.replace(/[\\`]/g, "\\$&")}\``;
  }

  return String(value);
};

const getComparison = (comparison: FilterComparison): string => {
  const { field } = comparison;

  // `:=` is exact. `:` matches a token inside the value, so "red" would also
  // find "dark red" and look right while being wrong.
  if (comparison.operator === "eq") {
    return `${field}:=${getValue(comparison.value)}`;
  }

  if (comparison.operator === "neq") {
    return `${field}:!=${getValue(comparison.value)}`;
  }

  if (comparison.operator === "in") {
    return `${field}:=[${comparison.value.map(getValue).join(",")}]`;
  }

  if (comparison.operator === "not-in") {
    return `${field}:!=[${comparison.value.map(getValue).join(",")}]`;
  }

  if (comparison.operator === "gt") {
    return `${field}:>${comparison.value}`;
  }

  if (comparison.operator === "gte") {
    return `${field}:>=${comparison.value}`;
  }

  if (comparison.operator === "lt") {
    return `${field}:<${comparison.value}`;
  }

  if (comparison.operator === "lte") {
    return `${field}:<=${comparison.value}`;
  }

  if (comparison.operator === "between") {
    const [min, max] = comparison.value;

    return `${field}:[${min}..${max}]`;
  }

  return assertUnreachable(comparison.operator);
};

// Typesense negates a field and never a group, so a negation is pushed down
// to the leaves by De Morgan, which leaves the meaning unchanged.
const getNegation = (expression: FilterExpression): FilterExpression => {
  if (expression.type === "not") {
    return expression.expression;
  }

  if (expression.type === "and") {
    return { type: "or", expressions: expression.expressions.map(getNegation) };
  }

  if (expression.type === "or") {
    return {
      type: "and",
      expressions: expression.expressions.map(getNegation),
    };
  }

  if (expression.operator === "eq") {
    return { ...expression, operator: "neq" };
  }

  if (expression.operator === "neq") {
    return { ...expression, operator: "eq" };
  }

  if (expression.operator === "in") {
    return { ...expression, operator: "not-in" };
  }

  if (expression.operator === "not-in") {
    return { ...expression, operator: "in" };
  }

  if (expression.operator === "gt") {
    return { ...expression, operator: "lte" };
  }

  if (expression.operator === "gte") {
    return { ...expression, operator: "lt" };
  }

  if (expression.operator === "lt") {
    return { ...expression, operator: "gte" };
  }

  if (expression.operator === "lte") {
    return { ...expression, operator: "gt" };
  }

  // There is no negated range either, so the complement of [min..max] is the
  // two open ranges around it.
  if (expression.operator === "between") {
    const [min, max] = expression.value;
    const { field } = expression;

    return {
      type: "or",
      expressions: [
        { type: "comparison", field, operator: "lt", value: min },
        { type: "comparison", field, operator: "gt", value: max },
      ],
    };
  }

  return assertUnreachable(expression.operator);
};

/**
 * One `filter_by` string for a normalised filter. Every group is
 * parenthesised, so precedence is the tree's and never the parser's.
 *
 * @example
 * ```ts
 * getFilterByFromFilter({ type: "comparison", field: "brand", operator: "eq", value: "Acme" });
 * // "brand:=`Acme`"
 * ```
 */
export const getFilterByFromFilter = (expression: FilterExpression): string => {
  if (expression.type === "comparison") {
    return getComparison(expression);
  }

  if (expression.type === "not") {
    return getFilterByFromFilter(getNegation(expression.expression));
  }

  if (expression.type === "and" || expression.type === "or") {
    return `(${expression.expressions.map(getFilterByFromFilter).join(FILTER_JOINERS[expression.type])})`;
  }

  return assertUnreachable(expression);
};
