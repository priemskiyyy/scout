import type { FilterExpression } from "src/types/FilterExpression";
import { assertUnreachable } from "src/utils/internal/assertUnreachable";

/** Takes ownership of the tree returned by a caller's where callback. */
export const snapshotFilter = (filter: FilterExpression): FilterExpression => {
  if (filter.type === "comparison") {
    // A list operand is the caller's to change afterwards, so it is copied.
    if (filter.operator === "in" || filter.operator === "not-in") {
      return Object.freeze({
        ...filter,
        value: Object.freeze([...filter.value]),
      });
    }

    if (filter.operator === "between") {
      const [min, max] = filter.value;
      const bounds: readonly [number, number] = [min, max];

      return Object.freeze({ ...filter, value: Object.freeze(bounds) });
    }

    return Object.freeze({ ...filter });
  }

  if (filter.type === "and" || filter.type === "or") {
    return Object.freeze({
      ...filter,
      expressions: Object.freeze(filter.expressions.map(snapshotFilter)),
    });
  }

  if (filter.type === "not") {
    return Object.freeze({
      ...filter,
      expression: snapshotFilter(filter.expression),
    });
  }

  return assertUnreachable(filter);
};
