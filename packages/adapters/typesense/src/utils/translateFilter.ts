import type { FilterExpression, FilterOperator } from "@priemskiyyy/scout";
import { refuse } from "src/utils/internal/refuse";

import { assertUnreachable } from "@priemskiyyy/scout";

type ComparisonExpression = Extract<FilterExpression, { type: "comparison" }>;

/** What one filter subtree became: no restriction, nothing, or an expression. */
type TranslatedFilter =
  | { readonly kind: "ALL" }
  | { readonly kind: "NONE" }
  | { readonly kind: "EXPRESSION"; readonly text: string };

const FILTER_ALL: TranslatedFilter = { kind: "ALL" };

const FILTER_NONE: TranslatedFilter = { kind: "NONE" };

const filterExpression = (text: string): TranslatedFilter => ({
  kind: "EXPRESSION",
  text,
});

const describe = (value: unknown): string =>
  value === null ? "null" : typeof value;

/**
 * Typesense reads a backtick quoted value literally, so only a backtick and a
 * backslash have to be escaped inside one. Everything else that would otherwise
 * end a value or start an operator, including a comma, a bracket, a bracketed
 * range, a parenthesis, `&&`, `||` and any Unicode, is already inert there.
 */
const escapeString = (value: string): string =>
  `\`${value.replace(/[\\`]/g, "\\$&")}\``;

const renderValue = (field: string, value: unknown): string => {
  if (typeof value === "string") {
    return escapeString(value);
  }
  if (typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return refuse(
        `filter.${field}`,
        `Typesense cannot filter ${field} on ${String(value)}, because a ` +
          `filter_by number has to be finite.`,
      );
    }
    return String(value);
  }
  return refuse(
    `filter.${field}`,
    `Typesense can filter ${field} on a string, a number or a boolean, and ` +
      `${describe(value)} was given. Convert it at the call site, so the ` +
      `encoding is the application's choice rather than the adapter's guess.`,
  );
};

const renderNumber = (field: string, value: unknown): string => {
  if (typeof value !== "number") {
    return refuse(
      `filter.${field}`,
      `Typesense compares ${field} with a number, and ${describe(value)} was ` +
        `given. A string comparison is not a range in Typesense, so it would ` +
        `answer something other than what was asked.`,
    );
  }
  return renderValue(field, value);
};

const renderList = (field: string, value: unknown): readonly string[] => {
  if (!Array.isArray(value)) {
    return refuse(
      `filter.${field}`,
      `A set filter on ${field} needs an array of values, and ` +
        `${describe(value)} was given.`,
    );
  }
  return value.map((member) => renderValue(field, member));
};

const readRange = (field: string, value: unknown): [number, number] => {
  const range = Array.isArray(value) ? value : [];
  const [min, max] = range;
  if (typeof min !== "number" || typeof max !== "number") {
    return refuse(
      `filter.${field}`,
      `A between filter on ${field} needs a numeric lower and upper bound, ` +
        `because a Typesense range is [min..max] over a numeric field.`,
    );
  }
  return [min, max];
};

const INVERTED_OPERATOR: Readonly<
  Record<Exclude<FilterOperator, "between">, FilterOperator>
> = {
  eq: "neq",
  neq: "eq",
  in: "not-in",
  "not-in": "in",
  gt: "lte",
  gte: "lt",
  lt: "gte",
  lte: "gt",
};

const negateComparison = (
  expression: ComparisonExpression,
): FilterExpression => {
  if (expression.operator === "between") {
    // Typesense has no negated range, so the complement of [min..max] is spelt
    // as the two open ranges around it.
    const [min, max] = readRange(expression.field, expression.value);
    return {
      type: "or",
      expressions: [
        {
          type: "comparison",
          field: expression.field,
          operator: "lt",
          value: min,
        },
        {
          type: "comparison",
          field: expression.field,
          operator: "gt",
          value: max,
        },
      ],
    };
  }
  return { ...expression, operator: INVERTED_OPERATOR[expression.operator] };
};

/**
 * Pushes a negation down to the leaves, because Typesense negates a field and
 * never a group: there is no `!(a && b)` to write. De Morgan is the only
 * rewrite here, so the meaning of the tree is unchanged.
 */
const negate = (expression: FilterExpression): FilterExpression => {
  if (expression.type === "constant") {
    return { type: "constant", value: !expression.value };
  }
  if (expression.type === "not") {
    return expression.expression;
  }
  if (expression.type === "and") {
    return { type: "or", expressions: expression.expressions.map(negate) };
  }
  if (expression.type === "or") {
    return { type: "and", expressions: expression.expressions.map(negate) };
  }
  if (expression.type === "comparison") {
    return negateComparison(expression);
  }
  return assertUnreachable(expression);
};

const translateComparison = (
  expression: ComparisonExpression,
): TranslatedFilter => {
  const { field, operator, value } = expression;
  if (operator === "eq") {
    // `:=` is exact. `:` would match a token inside the value, so a filter on
    // "red" would also return "dark red" and look correct while being wrong.
    return filterExpression(`${field}:=${renderValue(field, value)}`);
  }
  if (operator === "neq") {
    return filterExpression(`${field}:!=${renderValue(field, value)}`);
  }
  if (operator === "in" || operator === "not-in") {
    const members = renderList(field, value);
    if (members.length === 0) {
      // An empty set matches nothing and its negation restricts nothing. The
      // core normalises this away, but an adapter called directly still has to
      // mean something rather than send `field:=[]`.
      return operator === "in" ? FILTER_NONE : FILTER_ALL;
    }
    const operatorText = operator === "in" ? ":=" : ":!=";
    return filterExpression(`${field}${operatorText}[${members.join(",")}]`);
  }
  if (operator === "gt") {
    return filterExpression(`${field}:>${renderNumber(field, value)}`);
  }
  if (operator === "gte") {
    return filterExpression(`${field}:>=${renderNumber(field, value)}`);
  }
  if (operator === "lt") {
    return filterExpression(`${field}:<${renderNumber(field, value)}`);
  }
  if (operator === "lte") {
    return filterExpression(`${field}:<=${renderNumber(field, value)}`);
  }
  if (operator === "between") {
    const [min, max] = readRange(field, value);
    return filterExpression(`${field}:[${min}..${max}]`);
  }
  return assertUnreachable(operator);
};

/**
 * Turns the normalised filter tree into one `filter_by` string.
 *
 * A constant folds away here rather than being spelt out, because Typesense has
 * no literal true or false to write: an `and` is nothing the moment one branch
 * is, and an `or` is everything the moment one branch is. Every group of more
 * than one branch is parenthesised, so precedence is the tree's and never the
 * parser's.
 */
export const translateFilter = (
  expression: FilterExpression,
): TranslatedFilter => {
  if (expression.type === "constant") {
    return expression.value ? FILTER_ALL : FILTER_NONE;
  }
  if (expression.type === "comparison") {
    return translateComparison(expression);
  }
  if (expression.type === "not") {
    return translateFilter(negate(expression.expression));
  }
  if (expression.type === "and" || expression.type === "or") {
    const conjunction = expression.type === "and";
    const parts: string[] = [];
    for (const child of expression.expressions) {
      const translated = translateFilter(child);
      if (translated.kind === "ALL") {
        if (!conjunction) {
          return FILTER_ALL;
        }
        continue;
      }
      if (translated.kind === "NONE") {
        if (conjunction) {
          return FILTER_NONE;
        }
        continue;
      }
      if (translated.kind === "EXPRESSION") {
        parts.push(translated.text);
        continue;
      }
      assertUnreachable(translated);
    }
    const only = parts[0];
    if (typeof only !== "string") {
      return conjunction ? FILTER_ALL : FILTER_NONE;
    }
    if (parts.length === 1) {
      return filterExpression(only);
    }
    return filterExpression(`(${parts.join(conjunction ? " && " : " || ")})`);
  }
  return assertUnreachable(expression);
};
