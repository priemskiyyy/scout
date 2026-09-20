import type { OramaWhere } from "src/types/OramaWhere";
import { declaredKind } from "src/utils/internal/declaredKind";
import { refuse } from "src/utils/internal/refuse";
import { ADAPTER_NAME } from "src/utils/constants/adapterName";
import type { FilterExpression, FilterOperator } from "@priemskiyyy/scout";
import { assertUnreachable } from "@priemskiyyy/scout";

/** Orama reads an empty `and` as an empty intersection, so nothing matches. */
const MATCH_NONE: OramaWhere = Object.freeze({ and: [] });

/** The complement of the expression that matches nothing. */
const MATCH_ALL: OramaWhere = Object.freeze({ not: MATCH_NONE });

/** The property kinds Orama filters by value rather than by token. */
type ExactKind = "number" | "enum" | "boolean";

const exactKind = (
  schema: Readonly<Record<string, unknown>>,
  field: string,
): ExactKind => {
  const kind = declaredKind(schema, field);
  if (kind === "number" || kind === "enum" || kind === "boolean") {
    return kind;
  }
  if (kind === null) {
    return refuse(
      `filters.field.${field}`,
      `The ${ADAPTER_NAME} adapter cannot filter on ${field}, because the ` +
        `database schema does not declare it.`,
    );
  }
  return refuse(
    `filters.field.${field}`,
    `The ${ADAPTER_NAME} adapter cannot filter on ${field}, because Orama ` +
      `matches a ${kind} property by token rather than by value. Declare it ` +
      `as enum, number or boolean in the database schema to filter it exactly.`,
  );
};

const refuseValue = (
  field: string,
  operator: FilterOperator,
  expected: string,
  value: unknown,
): never =>
  refuse(
    `filters.${operator}`,
    `The ${ADAPTER_NAME} adapter needs ${expected} to apply ${operator} to ` +
      `${field}, and it was given ${typeof value}.`,
  );

const equalityWhere = (
  field: string,
  kind: ExactKind,
  operator: FilterOperator,
  value: unknown,
): OramaWhere => {
  if (kind === "boolean") {
    if (typeof value !== "boolean") {
      return refuseValue(field, operator, "a boolean", value);
    }
    return { [field]: value };
  }
  if (kind === "number") {
    if (typeof value !== "number") {
      return refuseValue(field, operator, "a number", value);
    }
    return { [field]: { eq: value } };
  }
  if (kind === "enum") {
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      return refuseValue(field, operator, "a string, number or boolean", value);
    }
    return { [field]: { eq: value } };
  }
  return assertUnreachable(kind);
};

const orderedWhere = (
  field: string,
  kind: ExactKind,
  operator: "gt" | "gte" | "lt" | "lte",
  value: unknown,
): OramaWhere => {
  if (kind !== "number") {
    return refuse(
      `filters.${operator}`,
      `The ${ADAPTER_NAME} adapter can order only a number property, and ` +
        `${field} is declared ${kind}.`,
    );
  }
  if (typeof value !== "number") {
    return refuseValue(field, operator, "a number", value);
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

const betweenWhere = (
  field: string,
  kind: ExactKind,
  value: unknown,
): OramaWhere => {
  if (kind !== "number") {
    return refuse(
      "filters.between",
      `The ${ADAPTER_NAME} adapter can bound only a number property, and ` +
        `${field} is declared ${kind}.`,
    );
  }
  const bounds: readonly unknown[] = Array.isArray(value) ? value : [];
  const lower = bounds[0];
  const upper = bounds[1];
  if (typeof lower !== "number" || typeof upper !== "number") {
    return refuseValue(field, "between", "two numbers", value);
  }
  return { [field]: { between: [lower, upper] } };
};

const setWhere = (
  field: string,
  kind: ExactKind,
  operator: FilterOperator,
  value: unknown,
): OramaWhere => {
  const values: readonly unknown[] = Array.isArray(value) ? value : [value];
  // Orama has `in` on an enum property only, so a union of equalities covers
  // every exact kind through one translation instead of three.
  return { or: values.map((one) => equalityWhere(field, kind, operator, one)) };
};

const comparisonWhere = (
  schema: Readonly<Record<string, unknown>>,
  expression: {
    field: string;
    operator: FilterOperator;
    value: unknown;
  },
): OramaWhere => {
  const { field, operator, value } = expression;
  const kind = exactKind(schema, field);

  if (operator === "eq") {
    return equalityWhere(field, kind, operator, value);
  }
  if (operator === "neq") {
    // Orama has no negated equality, so the complement of the matching set is
    // the only honest translation. A document missing the property is in it.
    return { not: equalityWhere(field, kind, operator, value) };
  }
  if (operator === "in") {
    return setWhere(field, kind, operator, value);
  }
  if (operator === "not-in") {
    return { not: setWhere(field, kind, operator, value) };
  }
  if (operator === "between") {
    return betweenWhere(field, kind, value);
  }
  if (
    operator === "gt" ||
    operator === "gte" ||
    operator === "lt" ||
    operator === "lte"
  ) {
    return orderedWhere(field, kind, operator, value);
  }
  return assertUnreachable(operator);
};

export const whereFor = (
  schema: Readonly<Record<string, unknown>>,
  expression: FilterExpression,
): OramaWhere => {
  if (expression.type === "constant") {
    return expression.value ? MATCH_ALL : MATCH_NONE;
  }
  if (expression.type === "and") {
    return { and: expression.expressions.map((one) => whereFor(schema, one)) };
  }
  if (expression.type === "or") {
    return { or: expression.expressions.map((one) => whereFor(schema, one)) };
  }
  if (expression.type === "not") {
    return { not: whereFor(schema, expression.expression) };
  }
  if (expression.type === "comparison") {
    return comparisonWhere(schema, expression);
  }
  return assertUnreachable(expression);
};
