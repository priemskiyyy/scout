import type { FilterExpression } from "src/types/FilterExpression";
import { assertUnreachable } from "src/utils/assertUnreachable";
import { snapshotValue } from "src/utils/internal/snapshotValue";

/** Takes ownership of the tree returned by a caller's where callback. */
export const snapshotFilter = (filter: FilterExpression): FilterExpression => {
  if (filter.type === "comparison") {
    return Object.freeze({ ...filter, value: snapshotValue(filter.value) });
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
  if (filter.type === "constant") {
    return Object.freeze({ ...filter });
  }
  return assertUnreachable(filter);
};
