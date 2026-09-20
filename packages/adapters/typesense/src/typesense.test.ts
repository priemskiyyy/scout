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

test("a contradiction answers empty without asking the engine", async () => {
  const { fake, adapter } = setup();
  const response = await adapter.search(
    request({ filter: { type: "constant", value: false }, facets: ["brand"] }),
    { signal: new AbortController().signal },
  );

  expect(fake.calls).toHaveLength(0);
  expect(response.hits).toHaveLength(0);
  expect(response.total).toEqual({
    value: 0,
    accuracy: "exact",
    scope: "matches",
  });
  // Nothing matched, so the counting was trivially complete. Reporting no
  // facets at all would make the core call a settled question unknown.
  expect(response.facets["brand"]).toEqual({
    field: "brand",
    values: [],
    exhaustive: true,
    native: null,
  });
  expect(response.native).toBeNull();
  expect(response.took).toBeNull();
});

test("a contradiction inside an and makes the whole filter match nothing", async () => {
  const { fake, adapter } = setup();
  await adapter.search(
    request({
      filter: {
        type: "and",
        expressions: [
          field("brand", "eq", "Nimbus"),
          { type: "constant", value: false },
        ],
      },
    }),
    { signal: new AbortController().signal },
  );

  expect(fake.calls).toHaveLength(0);
});

test("a tautology inside an or drops the rest of the group", async () => {
  expect(
    await filterFor({
      type: "or",
      expressions: [
        field("brand", "eq", "Nimbus"),
        { type: "constant", value: true },
      ],
    }),
  ).toBeUndefined();
});

test("a filter that restricts nothing sends no filter_by", async () => {
  expect(await filterFor({ type: "constant", value: true })).toBeUndefined();
});

test("the profile decides query_by and prefix, and the sort decides sort_by", async () => {
  const withSort = await sentFor({ sort: "priceAsc" });
  const plain = await sentFor({ profile: "plain" });

  expect(withSort?.query_by).toBe("name,brand,tags");
  expect(withSort?.prefix).toBe(true);
  expect(withSort?.sort_by).toBe("price:asc");
  expect(plain?.query_by).toBe("name");
  expect(plain?.prefix).toBeUndefined();
  // "relevance" declares no sort_by, so Typesense keeps its own ranking.
  expect(plain?.sort_by).toBeUndefined();
});

test("an undeclared sort or profile is a configuration error", async () => {
  await expect(sentFor({ sort: "missing" })).rejects.toThrowError(
    SearchConfigurationError,
  );
  await expect(sentFor({ profile: "missing" })).rejects.toThrowError(
    SearchConfigurationError,
  );
});

test("facets, highlights, the page and the page size reach their parameters", async () => {
  const sent = await sentFor({
    facets: ["brand", "price"],
    highlights: ["name"],
    page: { current: 3, size: 25 },
  });

  expect(sent?.facet_by).toBe("brand,price");
  expect(sent?.highlight_fields).toBe("name");
  // Minted per search, so the test asserts the shape and the pairing rather
  // than a literal. A fixed marker is what let a document forge a match.
  expect(sent?.highlight_start_tag).toMatch(/^\[scout:[0-9a-z-]+\]$/);
  expect(sent?.highlight_end_tag).toBe(
    sent?.highlight_start_tag?.replace("[scout:", "[/scout:"),
  );
  // Typesense pages are one based like Scout's, so nothing is shifted.
  expect(sent?.page).toBe(3);
  expect(sent?.per_page).toBe(25);
});

test("nothing is highlighted or faceted when nothing was asked for", async () => {
  const sent = await sentFor({});

  expect(sent?.facet_by).toBeUndefined();
  expect(sent?.highlight_fields).toBeUndefined();
});

test("the page size Typesense refuses is the one the capabilities cap", async () => {
  const { adapter } = setup();

  expect(adapter.capabilities.pagination.maxPageSize).toBe(250);
  expect(adapter.capabilities.cancellation).toBe("transport");
  expect(adapter.capabilities.highlights).toBe("parts");
});

test("an empty query is sent as the Typesense wildcard", async () => {
  expect((await sentFor({ query: "" }))?.q).toBe("*");
  expect((await sentFor({ query: "shoe" }))?.q).toBe("shoe");
});

test("the signal reaches the client, which is what transport cancellation means", async () => {
  const { fake, adapter } = setup();
  const controller = new AbortController();
  await adapter.search(request(), { signal: controller.signal });

  expect(fake.signals[0]).toBe(controller.signal);
});
