import type { FilterExpression, FilterValue } from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import { getFilterByFromFilter } from "src/utils/getFilterByFromFilter";

const getEquality = (
  field: string,
  operator: "eq" | "neq",
  value: FilterValue,
): FilterExpression => ({ type: "comparison", field, operator, value });

const getSet = (
  field: string,
  operator: "in" | "not-in",
  value: readonly FilterValue[],
): FilterExpression => ({ type: "comparison", field, operator, value });

const getRange = (
  field: string,
  operator: "gt" | "gte" | "lt" | "lte",
  value: number,
): FilterExpression => ({ type: "comparison", field, operator, value });

const getBetween = (
  field: string,
  min: number,
  max: number,
): FilterExpression => ({
  type: "comparison",
  field,
  operator: "between",
  value: [min, max],
});

test("an eq filter on a string is exact and quoted, never a token match", () => {
  expect(getFilterByFromFilter(getEquality("brand", "eq", "dark red"))).toBe(
    "brand:=`dark red`",
  );
});

test("an eq filter on a number or a boolean is written bare", () => {
  expect(getFilterByFromFilter(getEquality("price", "eq", 120))).toBe(
    "price:=120",
  );
  expect(getFilterByFromFilter(getEquality("inStock", "eq", true))).toBe(
    "inStock:=true",
  );
});

test("a neq filter is written with the not equal operator", () => {
  expect(getFilterByFromFilter(getEquality("brand", "neq", "Nimbus"))).toBe(
    "brand:!=`Nimbus`",
  );
});

test("a set filter becomes a bracketed list, negated for notIn", () => {
  expect(getFilterByFromFilter(getSet("brand", "in", ["A", "B"]))).toBe(
    "brand:=[`A`,`B`]",
  );
  expect(getFilterByFromFilter(getSet("brand", "not-in", ["A", "B"]))).toBe(
    "brand:!=[`A`,`B`]",
  );
});

test("the four comparisons become their Typesense operators", () => {
  expect(getFilterByFromFilter(getRange("price", "gt", 1))).toBe("price:>1");
  expect(getFilterByFromFilter(getRange("price", "gte", 1))).toBe("price:>=1");
  expect(getFilterByFromFilter(getRange("price", "lt", 1))).toBe("price:<1");
  expect(getFilterByFromFilter(getRange("price", "lte", 1))).toBe("price:<=1");
});

test("a between filter becomes a Typesense range", () => {
  expect(getFilterByFromFilter(getBetween("price", 10, 20))).toBe(
    "price:[10..20]",
  );
});

test("every group is parenthesised, so precedence survives", () => {
  expect(
    getFilterByFromFilter({
      type: "and",
      expressions: [
        getEquality("inStock", "eq", true),
        {
          type: "or",
          expressions: [
            getEquality("brand", "eq", "A"),
            getEquality("brand", "eq", "B"),
          ],
        },
      ],
    }),
  ).toBe("(inStock:=true && (brand:=`A` || brand:=`B`))");
});

test("a negation is pushed down to the fields, because Typesense cannot negate a group", () => {
  expect(
    getFilterByFromFilter({
      type: "not",
      expression: {
        type: "and",
        expressions: [
          getEquality("brand", "eq", "A"),
          getRange("price", "gte", 100),
        ],
      },
    }),
  ).toBe("(brand:!=`A` || price:<100)");
});

test("a doubled negation is the expression itself again", () => {
  expect(
    getFilterByFromFilter({
      type: "not",
      expression: {
        type: "not",
        expression: getEquality("brand", "eq", "A"),
      },
    }),
  ).toBe("brand:=`A`");
});

test("a negated range becomes the two open ranges around it", () => {
  expect(
    getFilterByFromFilter({
      type: "not",
      expression: getBetween("price", 10, 20),
    }),
  ).toBe("(price:<10 || price:>20)");
});

// A backtick would end the quoted value early and a backslash would escape the
// wrong character, so those two are the only things rewritten. The rest proves
// that everything else stays untouched.
const HOSTILE = "a`b\\c,d[e](f)&&g||h\"i'j é́ \u{1F600} 中文";
const HOSTILE_ESCAPED = "a\\`b\\\\c,d[e](f)&&g||h\"i'j é́ \u{1F600} 中文";

test("a hostile value is quoted with only its backticks and backslashes escaped", () => {
  expect(getFilterByFromFilter(getEquality("brand", "eq", HOSTILE))).toBe(
    `brand:=\`${HOSTILE_ESCAPED}\``,
  );
});

test("a hostile value in a set is escaped member by member", () => {
  expect(getFilterByFromFilter(getSet("brand", "in", [HOSTILE, "b"]))).toBe(
    `brand:=[\`${HOSTILE_ESCAPED}\`,\`b\`]`,
  );
});
