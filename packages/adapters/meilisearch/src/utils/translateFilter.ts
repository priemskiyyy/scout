import {
  SearchConfigurationError,
  UnsupportedSearchFeatureError,
  assertUnreachable,
} from "@priemskiyyy/scout";

import type { FilterExpression } from "@priemskiyyy/scout";

const RANGE_SYMBOLS: Readonly<Record<"gt" | "gte" | "lt" | "lte", string>> = {
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
};

/**
 * A field name Meilisearch reads as one attribute. Anything else would end the
 * attribute and start a new clause, so it is refused rather than escaped.
 */
const FIELD_PATTERN = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

/** A mistake in how the adapter or the index was configured. */
const misconfigured = (path: string, message: string): never => {
  throw new SearchConfigurationError({
    path,
    message: `The meilisearch adapter ${message}`,
  });
};

/** A portable request this adapter cannot put into a Meilisearch filter. */
const unsupported = (feature: string, message: string): never => {
  throw new UnsupportedSearchFeatureError({
    adapter: "meilisearch",
    feature,
    message: `The meilisearch adapter ${message}`,
  });
};

const describeValue = (value: unknown) =>
  value === null ? "null" : typeof value;

/**
 * Meilisearch reads a double quoted string with backslash escapes, so a value
 * carrying a quote or a backslash is escaped rather than refused. The order
 * matters: backslashes first, or the backslash added for a quote would itself
 * be doubled.
 */
const escapeText = (value: string) =>
  `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const literal = (value: unknown, field: string): string => {
  if (typeof value === "string") {
    return escapeText(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}`;
  }
  if (typeof value === "boolean") {
    return `${value}`;
  }
  return unsupported(
    "filters.value",
    `cannot filter ${field} on ${describeValue(value)}. Meilisearch compares ` +
      `strings, finite numbers and booleans.`,
  );
};

const numeric = (value: unknown, field: string, operator: string): string => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}`;
  }
  return unsupported(
    `filters.${operator}`,
    `cannot apply ${operator} to ${field}: Meilisearch orders numbers, and ` +
      `${describeValue(value)} is not one.`,
  );
};

const setValues = (value: unknown, field: string, operator: string) => {
  if (!Array.isArray(value)) {
    return unsupported(
      `filters.${operator}`,
      `cannot apply ${operator} to ${field}: it takes a list, and ` +
        `${describeValue(value)} is not one.`,
    );
  }
  return value.map((entry) => literal(entry, field)).join(", ");
};

// Booleans represent constant filters that Meilisearch cannot spell on the wire.
export const translateFilter = (
  expression: FilterExpression,
): string | boolean => {
  if (expression.type === "constant") {
    return expression.value;
  }
  if (expression.type === "comparison") {
    return comparison(expression);
  }
  if (expression.type === "not") {
    const inner = translateFilter(expression.expression);
    if (typeof inner === "boolean") {
      return !inner;
    }
    return `NOT (${inner})`;
  }
  if (expression.type === "and" || expression.type === "or") {
    const children = expression.expressions.map(translateFilter);
    // Direct adapter calls can contain constants that core normally absorbs.
    const conjunction = expression.type === "and";
    if (children.includes(!conjunction)) {
      return !conjunction;
    }
    const kept = children.filter((child) => typeof child === "string");
    const [only] = kept;
    if (kept.length === 0) {
      return conjunction;
    }
    if (kept.length === 1 && typeof only === "string") {
      return only;
    }
    return kept.map((text) => `(${text})`).join(conjunction ? " AND " : " OR ");
  }
  return assertUnreachable(expression);
};

const comparison = (
  node: Extract<FilterExpression, { type: "comparison" }>,
): string => {
  const field = node.field;
  if (!FIELD_PATTERN.test(field)) {
    return misconfigured(
      "filterable",
      `cannot filter on ${JSON.stringify(field)}: a Meilisearch attribute is ` +
        `letters, digits, underscores, dots and dashes.`,
    );
  }
  const operator = node.operator;
  if (operator === "eq") {
    // Meilisearch has no null literal, so the absence of a value is its own
    // operator rather than the string "null".
    return node.value === null
      ? `${field} IS NULL`
      : `${field} = ${literal(node.value, field)}`;
  }
  if (operator === "neq") {
    return node.value === null
      ? `${field} IS NOT NULL`
      : `${field} != ${literal(node.value, field)}`;
  }
  if (operator === "in") {
    return `${field} IN [${setValues(node.value, field, operator)}]`;
  }
  if (operator === "not-in") {
    return `${field} NOT IN [${setValues(node.value, field, operator)}]`;
  }
  if (operator === "between") {
    const bounds = Array.isArray(node.value) ? node.value : [];
    if (bounds.length !== 2) {
      return unsupported(
        "filters.between",
        `cannot apply between to ${field}: it takes a lower and an upper bound.`,
      );
    }
    const lower = numeric(bounds[0], field, "between");
    const upper = numeric(bounds[1], field, "between");
    return `${field} ${lower} TO ${upper}`;
  }
  if (
    operator === "gt" ||
    operator === "gte" ||
    operator === "lt" ||
    operator === "lte"
  ) {
    return `${field} ${RANGE_SYMBOLS[operator]} ${numeric(node.value, field, operator)}`;
  }
  return assertUnreachable(operator);
};
