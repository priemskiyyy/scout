import { ScoutError } from "@priemskiyyy/scout";
import type {
  FilterComparison,
  FilterExpression,
  FilterOperator,
  FilterValue,
} from "@priemskiyyy/scout";

import type { OramaWhere } from "src/types/OramaWhere";
import { assertUnreachable } from "src/utils/assertUnreachable";
import { getDeclaredKind } from "src/utils/getDeclaredKind";

/** The property kinds Orama filters by value rather than by token. */
type ExactKind = "number" | "enum" | "boolean";

const getValueError = (
  field: string,
  operator: FilterOperator,
  expected: string,
) =>
  new ScoutError({
    code: "configuration",
    message: `Orama needs ${expected} to apply ${operator} to ${field}.`,
  });

const getExactKind = (
  schema: Readonly<Record<string, unknown>>,
  field: string,
): ExactKind => {
  const kind = getDeclaredKind(schema, field);

  if (kind === "number" || kind === "enum" || kind === "boolean") {
    return kind;
  }

  if (kind === null) {
    throw new ScoutError({
      code: "configuration",
      message: `The Orama schema does not declare ${field}.`,
    });
  }

  // A string property is matched by token, so a filter on "Acme Audio" would
  // also match "Acme", which is not what eq means anywhere else in Scout.
  throw new ScoutError({
    code: "unsupported-feature",
    message:
      `Orama filters a number, enum or boolean property by value, and ` +
      `${field} is declared ${kind}. Declare it as one of those to filter it.`,
  });
};

// The value has to be one the property's kind holds, which only the Orama
// schema knows.
const getEquality = (
  field: string,
  kind: ExactKind,
  operator: FilterOperator,
  value: FilterValue,
): OramaWhere => {
  if (kind === "boolean") {
    if (typeof value !== "boolean") {
      throw getValueError(field, operator, "a boolean");
    }

    return { [field]: value };
  }

  if (kind === "number") {
    if (typeof value !== "number") {
      throw getValueError(field, operator, "a number");
    }

    return { [field]: { eq: value } };
  }

  if (kind === "enum") {
    return { [field]: { eq: value } };
  }

  return assertUnreachable(kind);
};

// Orama has `in` on an enum property only, so a union of equalities covers
// every exact kind through one translation.
const getSet = (
  field: string,
  kind: ExactKind,
  operator: FilterOperator,
  values: readonly FilterValue[],
): OramaWhere => ({
  or: values.map((member) => getEquality(field, kind, operator, member)),
});

const getOrdering = (
  field: string,
  kind: ExactKind,
  operator: "gt" | "gte" | "lt" | "lte",
  value: number,
): OramaWhere => {
  if (kind !== "number") {
    throw new ScoutError({
      code: "unsupported-feature",
      message: `Orama orders a number property only, and ${field} is declared ${kind}.`,
    });
  }

  if (operator === "gt") {
    return { [field]: { gt: value } };
  }

  if (operator === "gte") {
    return { [field]: { gte: value } };
  }

  if (operator === "lt") {
    return { [field]: { lt: value } };
  }

  if (operator === "lte") {
    return { [field]: { lte: value } };
  }

  return assertUnreachable(operator);
};

const getBetween = (
  field: string,
  kind: ExactKind,
  [lower, upper]: readonly [number, number],
): OramaWhere => {
  if (kind !== "number") {
    throw new ScoutError({
      code: "unsupported-feature",
      message: `Orama bounds a number property only, and ${field} is declared ${kind}.`,
    });
  }

  return { [field]: { between: [lower, upper] } };
};

const getComparison = (
  schema: Readonly<Record<string, unknown>>,
  comparison: FilterComparison,
): OramaWhere => {
  const { field } = comparison;
  const kind = getExactKind(schema, field);

  if (comparison.operator === "eq") {
    return getEquality(field, kind, comparison.operator, comparison.value);
  }

  // Orama has no negated equality, so the complement of the matching set is
  // the translation. A document that lacks the property is in it.
  if (comparison.operator === "neq") {
    return {
      not: getEquality(field, kind, comparison.operator, comparison.value),
    };
  }

  if (comparison.operator === "in") {
    return getSet(field, kind, comparison.operator, comparison.value);
  }

  if (comparison.operator === "not-in") {
    return { not: getSet(field, kind, comparison.operator, comparison.value) };
  }

  if (comparison.operator === "between") {
    return getBetween(field, kind, comparison.value);
  }

  if (
    comparison.operator === "gt" ||
    comparison.operator === "gte" ||
    comparison.operator === "lt" ||
    comparison.operator === "lte"
  ) {
    return getOrdering(field, kind, comparison.operator, comparison.value);
  }

  return assertUnreachable(comparison.operator);
};

/**
 * Orama's `where` for a normalised filter. Orama takes `and`, `or` and `not`
 * as a tree, so the filter keeps its shape.
 *
 * @example
 * ```ts
 * getWhereFromFilter({ brand: "enum" }, { type: "comparison", field: "brand", operator: "eq", value: "Acme" });
 * // { brand: { eq: "Acme" } }
 * ```
 */
export const getWhereFromFilter = (
  schema: Readonly<Record<string, unknown>>,
  expression: FilterExpression,
): OramaWhere => {
  if (expression.type === "and") {
    return {
      and: expression.expressions.map((member) =>
        getWhereFromFilter(schema, member),
      ),
    };
  }

  if (expression.type === "or") {
    return {
      or: expression.expressions.map((member) =>
        getWhereFromFilter(schema, member),
      ),
    };
  }

  if (expression.type === "not") {
    return { not: getWhereFromFilter(schema, expression.expression) };
  }

  if (expression.type === "comparison") {
    return getComparison(schema, expression);
  }

  return assertUnreachable(expression);
};
