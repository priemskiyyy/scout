import { ScoutError } from "@priemskiyyy/scout";
import type {
  FilterComparison,
  FilterExpression,
  FilterValue,
} from "@priemskiyyy/scout";

import { assertUnreachable } from "src/utils/assertUnreachable";
import { BARE_ATTRIBUTE, TAGS_ATTRIBUTE } from "src/utils/constants/filters";

// The backslash is doubled before the quote is escaped, or escaping the quote
// would make a backslash that the next pass escapes again.
const quote = (value: string) =>
  `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const getAttribute = (field: string) => {
  if (BARE_ATTRIBUTE.test(field)) {
    return field;
  }

  return quote(field);
};

const getEqualTerm = (field: string, value: FilterValue): string => {
  if (typeof value === "string") {
    return `${getAttribute(field)}:${quote(value)}`;
  }

  if (typeof value === "boolean") {
    return `${getAttribute(field)}:${String(value)}`;
  }

  return `${getAttribute(field)} = ${String(value)}`;
};

// `NOT price = 3` is outside the numeric grammar, so a number is negated with
// Algolia's own `!=`.
const getNotEqualTerm = (field: string, value: FilterValue): string => {
  if (typeof value === "number") {
    return `${getAttribute(field)} != ${String(value)}`;
  }

  return `NOT ${getEqualTerm(field, value)}`;
};

const getKind = (value: FilterValue) => {
  if (typeof value === "number") {
    return "numeric";
  }

  return "facet";
};

// Algolia keeps numeric, facet and tag filters apart, and an OR group may
// hold only one kind.
const getKinds = (expression: FilterExpression): readonly string[] => {
  if (expression.type === "comparison") {
    if (expression.field === TAGS_ATTRIBUTE) {
      return ["tag"];
    }

    if (expression.operator === "in" || expression.operator === "not-in") {
      return expression.value.map(getKind);
    }

    if (expression.operator === "eq" || expression.operator === "neq") {
      return [getKind(expression.value)];
    }

    // Every range compares a number.
    return ["numeric"];
  }

  if (expression.type === "not") {
    return getKinds(expression.expression);
  }

  if (expression.type === "and" || expression.type === "or") {
    return expression.expressions.flatMap(getKinds);
  }

  return assertUnreachable(expression);
};

const getComparison = (
  expression: FilterComparison,
  insideOr: boolean,
): string => {
  const { field } = expression;

  if (expression.operator === "eq") {
    return getEqualTerm(field, expression.value);
  }

  if (expression.operator === "neq") {
    return getNotEqualTerm(field, expression.value);
  }

  if (expression.operator === "in") {
    if (new Set(getKinds(expression)).size > 1) {
      throw new ScoutError({
        code: "unsupported-feature",
        message:
          "Algolia cannot mix numeric and facet values in one set filter.",
      });
    }

    const terms = expression.value
      .map((member) => getEqualTerm(field, member))
      .join(" OR ");

    if (insideOr) {
      return terms;
    }

    return `(${terms})`;
  }

  if (expression.operator === "not-in") {
    if (insideOr && expression.value.length > 1) {
      throw new ScoutError({
        code: "unsupported-feature",
        message: "Algolia cannot place an AND group inside an OR group.",
      });
    }

    return expression.value
      .map((member) => getNotEqualTerm(field, member))
      .join(" AND ");
  }

  if (expression.operator === "gt") {
    return `${getAttribute(field)} > ${String(expression.value)}`;
  }

  if (expression.operator === "gte") {
    return `${getAttribute(field)} >= ${String(expression.value)}`;
  }

  if (expression.operator === "lt") {
    return `${getAttribute(field)} < ${String(expression.value)}`;
  }

  if (expression.operator === "lte") {
    return `${getAttribute(field)} <= ${String(expression.value)}`;
  }

  // Algolia reads `price:10 TO 100` as inclusive at both ends.
  if (expression.operator === "between") {
    const [min, max] = expression.value;

    return `${getAttribute(field)}:${String(min)} TO ${String(max)}`;
  }

  return assertUnreachable(expression.operator);
};

const getFilter = (expression: FilterExpression, insideOr: boolean): string => {
  if (expression.type === "comparison") {
    return getComparison(expression, insideOr);
  }

  if (expression.type === "not") {
    return getNegation(expression.expression, insideOr);
  }

  if (expression.type === "and") {
    if (insideOr) {
      throw new ScoutError({
        code: "unsupported-feature",
        message: "Algolia cannot place an AND group inside an OR group.",
      });
    }

    return expression.expressions
      .map((member) => getFilter(member, false))
      .join(" AND ");
  }

  if (expression.type === "or") {
    if (new Set(getKinds(expression)).size > 1) {
      throw new ScoutError({
        code: "unsupported-feature",
        message:
          "Algolia cannot mix numeric, facet and tag filters in an OR group.",
      });
    }

    const terms = expression.expressions
      .map((member) => getFilter(member, true))
      .join(" OR ");

    if (insideOr) {
      return terms;
    }

    return `(${terms})`;
  }

  return assertUnreachable(expression);
};

const getNegation = (
  expression: FilterExpression,
  insideOr: boolean,
): string => {
  if (expression.type === "not") {
    return getFilter(expression.expression, insideOr);
  }

  if (expression.type === "comparison" && expression.operator === "eq") {
    return getNotEqualTerm(expression.field, expression.value);
  }

  if (expression.type === "comparison" && expression.operator === "neq") {
    return getEqualTerm(expression.field, expression.value);
  }

  throw new ScoutError({
    code: "unsupported-feature",
    message: "Algolia negates a single equality, never a group or a range.",
  });
};

/**
 * One `filters` string for a normalised filter. Algolia accepts AND clauses
 * holding OR groups of one filter kind, not an arbitrary boolean tree, so
 * anything else is refused before it is sent.
 *
 * @example
 * ```ts
 * getFiltersFromFilter({ type: "comparison", field: "brand", operator: "eq", value: "acme" });
 * // 'brand:"acme"'
 * ```
 */
export const getFiltersFromFilter = (expression: FilterExpression): string =>
  getFilter(expression, false);
