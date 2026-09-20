import {
  UnsupportedSearchFeatureError,
  assertUnreachable,
  normalizeFilter,
} from "@priemskiyyy/scout";

import type { FilterExpression } from "@priemskiyyy/scout";

const refuse = (feature: string, message: string): never => {
  throw new UnsupportedSearchFeatureError({
    adapter: "algolia",
    feature,
    message,
  });
};

/**
 * Quotes a value for Algolia's `filters` grammar. The backslash has to be
 * doubled before the quote is escaped, otherwise escaping the quote would
 * produce a backslash that the next pass escapes again.
 */
const quote = (value: string): string =>
  `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

/**
 * Attribute names come from the index declaration rather than from a user, so
 * a bare name is left alone and anything else is quoted the same way a value
 * is. Quoting everything would be safe too, but a readable filter string is
 * what an application sees in a provider error.
 */
const BARE_ATTRIBUTE = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;

const attribute = (field: string): string => {
  if (BARE_ATTRIBUTE.test(field)) {
    return field;
  }
  return quote(field);
};

const requireNumber = (
  value: unknown,
  operator: string,
  field: string,
): number => {
  if (typeof value !== "number") {
    return refuse(
      `filters.${operator}`,
      `The algolia adapter compares ${field} numerically, and ${operator} was ` +
        `given a ${typeof value}.`,
    );
  }
  return value;
};

/** `field:"value"`, `field:true` or `field = 3`, by the type of the value. */
const equalTerm = (field: string, value: unknown, operator: string): string => {
  if (typeof value === "string") {
    return `${attribute(field)}:${quote(value)}`;
  }
  if (typeof value === "boolean") {
    return `${attribute(field)}:${String(value)}`;
  }
  if (typeof value === "number") {
    return `${attribute(field)} = ${String(value)}`;
  }
  return refuse(
    `filters.${operator}`,
    `The algolia adapter can only filter ${field} by a string, a number or a ` +
      `boolean, and it was given a ${typeof value}.`,
  );
};

/**
 * The negation of one term. A number is negated with Algolia's own `!=`
 * operator rather than with `NOT`, because `NOT field = 3` is not accepted by
 * the numeric part of the grammar.
 */
const notEqualTerm = (
  field: string,
  value: unknown,
  operator: string,
): string => {
  if (typeof value === "number") {
    return `${attribute(field)} != ${String(value)}`;
  }
  return `NOT ${equalTerm(field, value, operator)}`;
};

const comparisonTerm = (
  field: string,
  operator: "gt" | "gte" | "lt" | "lte",
  value: unknown,
): string => {
  const number = requireNumber(value, operator, field);
  if (operator === "gt") {
    return `${attribute(field)} > ${String(number)}`;
  }
  if (operator === "gte") {
    return `${attribute(field)} >= ${String(number)}`;
  }
  if (operator === "lt") {
    return `${attribute(field)} < ${String(number)}`;
  }
  if (operator === "lte") {
    return `${attribute(field)} <= ${String(number)}`;
  }
  return assertUnreachable(operator);
};

/** `field:min TO max`, which Algolia reads as inclusive at both ends. */
const betweenTerm = (field: string, value: unknown): string => {
  const bounds = Array.isArray(value) ? value : [];
  const [min, max] = bounds;
  if (bounds.length !== 2) {
    return refuse(
      "filters.between",
      `The algolia adapter needs a lower and an upper bound for ${field}.`,
    );
  }
  const lower = requireNumber(min, "between", field);
  const upper = requireNumber(max, "between", field);
  return `${attribute(field)}:${String(lower)} TO ${String(upper)}`;
};

const translateComparison = (
  expression: Extract<FilterExpression, { type: "comparison" }>,
  insideOr: boolean,
): string => {
  const { field, operator, value } = expression;
  if (operator === "eq") {
    return equalTerm(field, value, "eq");
  }
  if (operator === "neq") {
    return notEqualTerm(field, value, "neq");
  }
  if (operator === "in") {
    const values = Array.isArray(value) ? value : [];
    if (new Set(filterKinds(expression)).size > 1) {
      return refuse(
        "filters.in",
        "Algolia cannot mix numeric and facet values in a membership filter.",
      );
    }
    const terms = values
      .map((each) => equalTerm(field, each, "in"))
      .join(" OR ");
    return insideOr ? terms : `(${terms})`;
  }
  if (operator === "not-in") {
    const values = Array.isArray(value) ? value : [];
    if (insideOr && values.length > 1) {
      return refuse(
        "filters.booleanComposition",
        "Algolia cannot place an AND group inside an OR group.",
      );
    }
    return values
      .map((each) => notEqualTerm(field, each, "not-in"))
      .join(" AND ");
  }
  if (operator === "between") {
    return betweenTerm(field, value);
  }
  if (
    operator === "gt" ||
    operator === "gte" ||
    operator === "lt" ||
    operator === "lte"
  ) {
    return comparisonTerm(field, operator, value);
  }
  return assertUnreachable(operator);
};

/**
 * A translated filter: the string Algolia is given, or the constant the tree
 * collapsed to. Algolia has no spelling for a constant, so `true` means send no
 * `filters` at all and `false` means answer empty without a request.
 */
type TranslatedFilter = string | boolean;

const filterKinds = (expression: FilterExpression): readonly string[] => {
  if (expression.type === "constant") {
    return [];
  }
  if (expression.type === "comparison") {
    if (expression.field === "_tags") {
      return ["tag"];
    }
    const values = Array.isArray(expression.value)
      ? expression.value
      : [expression.value];
    return values.map((value) =>
      typeof value === "number" ? "numeric" : "facet",
    );
  }
  if (expression.type === "not") {
    return filterKinds(expression.expression);
  }
  if (expression.type === "and" || expression.type === "or") {
    return expression.expressions.flatMap(filterKinds);
  }
  return assertUnreachable(expression);
};

const renderFilter = (
  expression: FilterExpression,
  insideOr = false,
): TranslatedFilter => {
  if (expression.type === "constant") {
    return expression.value;
  }
  if (expression.type === "comparison") {
    return translateComparison(expression, insideOr);
  }
  if (expression.type === "not") {
    const inner = expression.expression;
    if (inner.type === "not") {
      return renderFilter(inner.expression, insideOr);
    }
    if (inner.type === "comparison" && inner.operator === "eq") {
      return notEqualTerm(inner.field, inner.value, "eq");
    }
    if (inner.type === "comparison" && inner.operator === "neq") {
      return equalTerm(inner.field, inner.value, "neq");
    }
    return refuse(
      "filters.booleanComposition",
      "Algolia can negate a single equality, but cannot negate a group or range. Express the supported comparisons explicitly.",
    );
  }
  if (expression.type === "and" || expression.type === "or") {
    if (expression.type === "and" && insideOr) {
      return refuse(
        "filters.booleanComposition",
        "Algolia cannot place an AND group inside an OR group.",
      );
    }
    if (expression.type === "or") {
      if (new Set(filterKinds(expression)).size > 1) {
        return refuse(
          "filters.booleanComposition",
          "Algolia cannot mix numeric, facet and tag filters in an OR group.",
        );
      }
    }
    const terms = expression.expressions.map((child) =>
      renderFilter(child, expression.type === "or"),
    );
    if (expression.type === "and") {
      return terms.join(" AND ");
    }
    const joined = terms.join(" OR ");
    return insideOr ? joined : `(${joined})`;
  }
  return assertUnreachable(expression);
};

/** Algolia accepts AND clauses containing OR groups, not arbitrary boolean trees. */
export const translateFilter = (
  expression: FilterExpression,
): TranslatedFilter => renderFilter(normalizeFilter(expression));
