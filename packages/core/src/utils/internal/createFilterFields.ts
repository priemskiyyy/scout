import { ScoutError } from "src/utils/ScoutError";
import type { FilterExpression } from "src/types/FilterExpression";
import type { FilterFields } from "src/types/FilterFields";
import type { FilterValue } from "src/types/FilterValue";
import type { IndexShape } from "src/types/IndexShape";

// Every operator exists at runtime; the type of `FilterFields` is what decides
// which ones a given field offers. Each takes the widest value any field could
// pass it, which makes this object assignable to every specific field type
// without an assertion.
type AnyFilterField = {
  eq: (value: FilterValue) => FilterExpression;
  neq: (value: FilterValue) => FilterExpression;
  in: (values: readonly FilterValue[]) => FilterExpression;
  notIn: (values: readonly FilterValue[]) => FilterExpression;
  gt: (value: number) => FilterExpression;
  gte: (value: number) => FilterExpression;
  lt: (value: number) => FilterExpression;
  lte: (value: number) => FilterExpression;
  between: (min: number, max: number) => FilterExpression;
};

// Reject reversed bounds before a provider silently answers with no matches.
const requireOrderedRange = (field: string, min: number, max: number) => {
  if (min <= max) {
    return;
  }

  throw new ScoutError({
    code: "configuration",
    message:
      `between(${String(min)}, ${String(max)}) on ${field} has its bounds the ` +
      `wrong way round, which every engine answers with no results and no ` +
      `error. between is inclusive and takes the lower bound first.`,
  });
};

const getFieldOperators = (field: string): AnyFilterField => ({
  eq: (value) => ({ type: "comparison", field, operator: "eq", value }),
  neq: (value) => ({ type: "comparison", field, operator: "neq", value }),
  in: (values) => ({
    type: "comparison",
    field,
    operator: "in",
    value: values,
  }),
  notIn: (values) => ({
    type: "comparison",
    field,
    operator: "not-in",
    value: values,
  }),
  gt: (value) => ({ type: "comparison", field, operator: "gt", value }),
  gte: (value) => ({ type: "comparison", field, operator: "gte", value }),
  lt: (value) => ({ type: "comparison", field, operator: "lt", value }),
  lte: (value) => ({ type: "comparison", field, operator: "lte", value }),
  between: (min, max) => {
    requireOrderedRange(field, min, max);

    return {
      type: "comparison",
      field,
      operator: "between",
      value: [min, max],
    };
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
    fields.map((field) => [field, getFieldOperators(field)]),
  );
}
