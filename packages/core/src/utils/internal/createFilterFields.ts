import { SearchConfigurationError } from "src/errors/SearchConfigurationError";
import type { FilterExpression } from "src/types/FilterExpression";
import type { FilterFields } from "src/types/FilterFields";
import type { FilterOperator } from "src/types/FilterOperator";
import type { IndexShape } from "src/types/IndexShape";

// Every operator exists at runtime; the type of `FilterFields` is what decides
// which ones a given field offers. Taking `unknown` here is what makes this
// object assignable to every specific field type without an assertion.
type AnyFilterField = {
  eq: (value: unknown) => FilterExpression;
  neq: (value: unknown) => FilterExpression;
  in: (values: readonly unknown[]) => FilterExpression;
  notIn: (values: readonly unknown[]) => FilterExpression;
  gt: (value: unknown) => FilterExpression;
  gte: (value: unknown) => FilterExpression;
  lt: (value: unknown) => FilterExpression;
  lte: (value: unknown) => FilterExpression;
  between: (min: unknown, max: unknown) => FilterExpression;
};

const comparison = (
  field: string,
  operator: FilterOperator,
  value: unknown,
): FilterExpression => ({ type: "comparison", field, operator, value });

// Reject reversed bounds before a provider silently answers with no matches.
const requireOrderedRange = (field: string, min: unknown, max: unknown) => {
  const comparable =
    (typeof min === "number" && typeof max === "number") ||
    (typeof min === "string" && typeof max === "string");
  if (!comparable || min <= max) {
    return;
  }
  throw new SearchConfigurationError({
    path: field,
    message:
      `between(${String(min)}, ${String(max)}) on ${field} has its bounds the ` +
      `wrong way round, which every engine answers with no results and no ` +
      `error. between is inclusive and takes the lower bound first.`,
  });
};

const fieldOperators = (field: string): AnyFilterField => ({
  eq: (value) => comparison(field, "eq", value),
  neq: (value) => comparison(field, "neq", value),
  in: (values) => comparison(field, "in", values),
  notIn: (values) => comparison(field, "not-in", values),
  gt: (value) => comparison(field, "gt", value),
  gte: (value) => comparison(field, "gte", value),
  lt: (value) => comparison(field, "lt", value),
  lte: (value) => comparison(field, "lte", value),
  between: (min, max) => {
    requireOrderedRange(field, min, max);
    return comparison(field, "between", [min, max]);
  },
});

/**
 * Builds the field objects a `where` callback receives.
 *
 * Built once per index rather than per search, and a plain object rather than a
 * Proxy: there is nothing dynamic to intercept once the filterable fields are
 * declared, and a plain object behaves the same on every engine.
 */
// An overload pair rather than an assertion. Enumerating runtime field names
// erases which operator set belongs to which field, and a mapped type cannot be
// built from runtime keys, so the declared signature states the relationship and
// the implementation signature carries the value. This is the same bridge Silo
// uses for its typed value lookup.
export function createFilterFields<TShape extends IndexShape>(
  fields: readonly TShape["filterable"][],
): FilterFields<TShape>;
export function createFilterFields(
  fields: readonly string[],
): Record<string, AnyFilterField> {
  // fromEntries keeps __proto__ an own field instead of invoking its setter.
  return Object.fromEntries<AnyFilterField>(
    fields.map((field) => [field, fieldOperators(field)]),
  );
}
