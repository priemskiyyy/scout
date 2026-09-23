import type { FilterComparison, FilterExpression } from "@priemskiyyy/scout";

import type { ElasticQuery } from "src/types/ElasticQuery";
import { assertUnreachable } from "src/utils/assertUnreachable";
import { getExactFieldFromKeywords } from "src/utils/getExactFieldFromKeywords";

const getComparisonQuery = (
  comparison: FilterComparison,
  keywords: Readonly<Record<string, string>>,
): ElasticQuery => {
  const field = getExactFieldFromKeywords(comparison.field, keywords);

  // A `term` is never analysed, so it compares the whole value and "red"
  // cannot also find "dark red".
  if (comparison.operator === "eq") {
    return { term: { [field]: { value: comparison.value } } };
  }

  if (comparison.operator === "neq") {
    return {
      bool: { must_not: [{ term: { [field]: { value: comparison.value } } }] },
    };
  }

  if (comparison.operator === "in") {
    return { terms: { [field]: [...comparison.value] } };
  }

  if (comparison.operator === "not-in") {
    return {
      bool: { must_not: [{ terms: { [field]: [...comparison.value] } }] },
    };
  }

  if (comparison.operator === "gt") {
    return { range: { [field]: { gt: comparison.value } } };
  }

  if (comparison.operator === "gte") {
    return { range: { [field]: { gte: comparison.value } } };
  }

  if (comparison.operator === "lt") {
    return { range: { [field]: { lt: comparison.value } } };
  }

  if (comparison.operator === "lte") {
    return { range: { [field]: { lte: comparison.value } } };
  }

  if (comparison.operator === "between") {
    const [min, max] = comparison.value;

    return { range: { [field]: { gte: min, lte: max } } };
  }

  return assertUnreachable(comparison.operator);
};

/**
 * The query for a normalised filter. Its values travel as JSON, so none of
 * them needs escaping, and every group is its own `bool`, so precedence is
 * the tree's.
 *
 * @example
 * ```ts
 * getQueryFromFilter(
 *   { type: "comparison", field: "brand", operator: "eq", value: "Acme" },
 *   { brand: "brand.keyword" },
 * );
 * // { term: { "brand.keyword": { value: "Acme" } } }
 * ```
 */
export const getQueryFromFilter = (
  expression: FilterExpression,
  keywords: Readonly<Record<string, string>>,
): ElasticQuery => {
  if (expression.type === "comparison") {
    return getComparisonQuery(expression, keywords);
  }

  if (expression.type === "and") {
    return {
      bool: {
        filter: expression.expressions.map((member) =>
          getQueryFromFilter(member, keywords),
        ),
      },
    };
  }

  // Said outright, so an or never depends on the clauses around it.
  if (expression.type === "or") {
    return {
      bool: {
        should: expression.expressions.map((member) =>
          getQueryFromFilter(member, keywords),
        ),
        minimum_should_match: 1,
      },
    };
  }

  if (expression.type === "not") {
    return {
      bool: {
        must_not: [getQueryFromFilter(expression.expression, keywords)],
      },
    };
  }

  return assertUnreachable(expression);
};
