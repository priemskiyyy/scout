import type { FilterExpression } from "src/types/FilterExpression";

/** The expression that matches every document. */
export const MATCH_ALL: FilterExpression = Object.freeze({
  type: "constant",
  value: true,
});

/** The expression that matches no document. */
export const MATCH_NONE: FilterExpression = Object.freeze({
  type: "constant",
  value: false,
});
