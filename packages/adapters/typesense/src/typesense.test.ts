import { SearchConfigurationError } from "@priemskiyyy/scout";
import type {
  AdapterSearchRequest,
  FilterExpression,
  FilterOperator,
} from "@priemskiyyy/scout";
import { expect, test } from "vitest";
import { typesense } from "src/typesense";
import type { TypesenseSearchParameters } from "src/types/TypesenseSearchParameters";
import { createTypesenseFake } from "src/typesense.fixture";
import type { TypesenseFakeOptions } from "src/typesense.fixture";

const setup = (options: TypesenseFakeOptions = {}) => {
  const fake = createTypesenseFake(options);
  const adapter = typesense({
    client: fake.client,
    collection: "products",
    profiles: {
      default: { queryBy: ["name", "brand", "tags"], prefix: true },
      plain: { queryBy: ["name"] },
    },
    sorts: { relevance: {}, priceAsc: { sortBy: "price:asc" } },
    facets: { price: "number", inStock: "boolean" },
  });
  return { fake, adapter };
};

const request = (
  overrides: Partial<AdapterSearchRequest<TypesenseSearchParameters>> = {},
): AdapterSearchRequest<TypesenseSearchParameters> => ({
  index: "products",
  query: "shoe",
  profile: "default",
  sort: "relevance",
  filter: { type: "constant", value: true },
  facets: [],
  highlights: [],
  page: { current: 1, size: 10 },
  provider: null,
  ...overrides,
});

const field = (
  name: string,
  operator: FilterOperator,
  value: unknown,
): FilterExpression => ({ type: "comparison", field: name, operator, value });

const sentFor = async (
  overrides: Partial<AdapterSearchRequest<TypesenseSearchParameters>>,
) => {
  const { fake, adapter } = setup();
  await adapter.search(request(overrides), {
    signal: new AbortController().signal,
  });
  return fake.calls[0];
};

const filterFor = async (filter: FilterExpression) =>
  (await sentFor({ filter }))?.filter_by;

test("an eq filter on a string is exact and quoted, never a token match", async () => {
  expect(await filterFor(field("brand", "eq", "dark red"))).toBe(
    "brand:=`dark red`",
  );
});

test("an eq filter on a number or a boolean is written bare", async () => {
  expect(await filterFor(field("price", "eq", 120))).toBe("price:=120");
  expect(await filterFor(field("inStock", "eq", true))).toBe("inStock:=true");
});

test("a neq filter is written with the not equal operator", async () => {
  expect(await filterFor(field("brand", "neq", "Nimbus"))).toBe(
    "brand:!=`Nimbus`",
  );
});

test("a set filter becomes a bracketed list, negated for notIn", async () => {
  expect(await filterFor(field("brand", "in", ["Nimbus", "Halden"]))).toBe(
    "brand:=[`Nimbus`,`Halden`]",
  );
  expect(await filterFor(field("price", "not-in", [1, 2]))).toBe(
    "price:!=[1,2]",
  );
});

test("an empty set matches nothing and its negation restricts nothing", async () => {
  const { fake, adapter } = setup();
  const empty = await adapter.search(
    request({ filter: field("brand", "in", []) }),
    { signal: new AbortController().signal },
  );

  expect(empty.hits).toHaveLength(0);
  expect(fake.calls).toHaveLength(0);
  expect(await filterFor(field("brand", "not-in", []))).toBeUndefined();
});

test("the four comparisons become their Typesense operators", async () => {
  expect(await filterFor(field("price", "gt", 10))).toBe("price:>10");
  expect(await filterFor(field("price", "gte", 10))).toBe("price:>=10");
  expect(await filterFor(field("price", "lt", 10))).toBe("price:<10");
  expect(await filterFor(field("price", "lte", 10))).toBe("price:<=10");
});

test("a between filter becomes a Typesense range", async () => {
  expect(await filterFor(field("price", "between", [100, 200]))).toBe(
    "price:[100..200]",
  );
});

test("a group of more than one branch is parenthesised so precedence survives", async () => {
  const filter: FilterExpression = {
    type: "and",
    expressions: [
      field("brand", "eq", "Nimbus"),
      {
        type: "or",
        expressions: [field("price", "lt", 100), field("inStock", "eq", true)],
      },
    ],
  };

  expect(await filterFor(filter)).toBe(
    "(brand:=`Nimbus` && (price:<100 || inStock:=true))",
  );
});

test("a negation is pushed down to the fields, because Typesense cannot negate a group", async () => {
  const filter: FilterExpression = {
    type: "not",
    expression: {
      type: "and",
      expressions: [field("brand", "eq", "Nimbus"), field("price", "gte", 100)],
    },
  };

  expect(await filterFor(filter)).toBe("(brand:!=`Nimbus` || price:<100)");
});

test("a doubled negation is the expression itself again", async () => {
  const filter: FilterExpression = {
    type: "not",
    expression: { type: "not", expression: field("brand", "eq", "Nimbus") },
  };

  expect(await filterFor(filter)).toBe("brand:=`Nimbus`");
});

test("a negated range becomes the two open ranges around it", async () => {
  const filter: FilterExpression = {
    type: "not",
    expression: field("price", "between", [100, 200]),
  };

  expect(await filterFor(filter)).toBe("(price:<100 || price:>200)");
});

// A backtick would end the quoted value early and a backslash would escape the
// wrong character, so both are the only things that have to be rewritten. The
// rest is here to prove it stays untouched.
const HOSTILE = "a`b\\c,d[e](f)&&g||h\"i'j é́ \u{1F600} 中文";
const HOSTILE_ESCAPED = "a\\`b\\\\c,d[e](f)&&g||h\"i'j é́ \u{1F600} 中文";

test("a hostile value is quoted with only its backticks and backslashes escaped", async () => {
  expect(await filterFor(field("name", "eq", HOSTILE))).toBe(
    `name:=\`${HOSTILE_ESCAPED}\``,
  );
});

test("a hostile value in a set is escaped member by member", async () => {
  expect(await filterFor(field("name", "in", ["x,y", "`z"]))).toBe(
    "name:=[`x,y`,`\\`z`]",
  );
});

test("a filter value that is not a string, a number or a boolean is refused", async () => {
  await expect(filterFor(field("name", "eq", null))).rejects.toThrowError(
    SearchConfigurationError,
  );
  await expect(
    filterFor(field("price", "eq", Number.NaN)),
  ).rejects.toThrowError(SearchConfigurationError);
});

test("a range comparison against a string is refused rather than guessed", async () => {
  await expect(filterFor(field("name", "gt", "a"))).rejects.toThrowError(
    SearchConfigurationError,
  );
  await expect(
    filterFor(field("price", "between", ["a", "b"])),
  ).rejects.toThrowError(SearchConfigurationError);
});
