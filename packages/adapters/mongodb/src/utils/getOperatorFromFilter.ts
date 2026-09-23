import { ScoutError } from "@priemskiyyy/scout";
import type {
  FilterComparison,
  FilterExpression,
  FilterValue,
} from "@priemskiyyy/scout";

import type { MongoSearchOperator } from "src/types/MongoSearchOperator";
import { assertUnreachable } from "src/utils/assertUnreachable";

// MongoDB Search compares a string only on a field it indexes as token, and a
// set only when every value in it has the same type.
const assertExactlyComparable = (
  path: string,
  values: readonly FilterValue[],
  tokens: readonly string[],
): void => {
  const types = new Set(values.map((value) => typeof value));

  if (types.size > 1) {
    throw new ScoutError({
      code: "unsupported-feature",
      message: `MongoDB Search compares ${path} with one type of value at a time, and this set mixes ${[...types].join(" and ")}.`,
    });
  }

  if (types.has("string") && !tokens.includes(path)) {
    throw new ScoutError({
      code: "unsupported-feature",
      message: `MongoDB Search compares a string only on a field indexed as token. Map ${path} as token and list it in tokens.`,
    });
  }
};

const getComparison = (
  comparison: FilterComparison,
  tokens: readonly string[],
): MongoSearchOperator => {
  const path = comparison.field;

  if (comparison.operator === "eq") {
    assertExactlyComparable(path, [comparison.value], tokens);

    return { equals: { path, value: comparison.value } };
  }

  if (comparison.operator === "neq") {
    return getOperatorFromFilter(
      { type: "not", expression: { ...comparison, operator: "eq" } },
      tokens,
    );
  }

  if (comparison.operator === "in") {
    assertExactlyComparable(path, comparison.value, tokens);

    return { in: { path, value: comparison.value } };
  }

  if (comparison.operator === "not-in") {
    return getOperatorFromFilter(
      { type: "not", expression: { ...comparison, operator: "in" } },
      tokens,
    );
  }

  if (comparison.operator === "gt") {
    return { range: { path, gt: comparison.value } };
  }

  if (comparison.operator === "gte") {
    return { range: { path, gte: comparison.value } };
  }

  if (comparison.operator === "lt") {
    return { range: { path, lt: comparison.value } };
  }

  if (comparison.operator === "lte") {
    return { range: { path, lte: comparison.value } };
  }

  if (comparison.operator === "between") {
    const [min, max] = comparison.value;

    return { range: { path, gte: min, lte: max } };
  }

  return assertUnreachable(comparison.operator);
};

/**
 * The MongoDB Search operator for a normalised filter. `tokens` are the fields
 * the search index maps as token, the only ones a string compares on.
 *
 * @example
 * ```ts
 * getOperatorFromFilter(
 *   { type: "comparison", field: "brand", operator: "eq", value: "Acme" },
 *   ["brand"],
 * );
 * // { equals: { path: "brand", value: "Acme" } }
 * ```
 */
export const getOperatorFromFilter = (
  expression: FilterExpression,
  tokens: readonly string[],
): MongoSearchOperator => {
  if (expression.type === "comparison") {
    return getComparison(expression, tokens);
  }

  // A compound of mustNot alone matches every other document, and the
  // search's own clause already limits the documents it can reach.
  if (expression.type === "not") {
    return {
      compound: {
        mustNot: [getOperatorFromFilter(expression.expression, tokens)],
      },
    };
  }

  if (expression.type === "and") {
    return {
      compound: {
        filter: expression.expressions.map((member) =>
          getOperatorFromFilter(member, tokens),
        ),
      },
    };
  }

  // minimumShouldMatch defaults to 0, so a should clause beside any other
  // clause would stop being required.
  if (expression.type === "or") {
    return {
      compound: {
        should: expression.expressions.map((member) =>
          getOperatorFromFilter(member, tokens),
        ),
        minimumShouldMatch: 1,
      },
    };
  }

  return assertUnreachable(expression);
};
