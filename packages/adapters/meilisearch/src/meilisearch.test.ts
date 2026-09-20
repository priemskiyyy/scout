import { expect, test } from "vitest";
import type {
  AdapterSearchRequest,
  FilterExpression,
} from "@priemskiyyy/scout";
import { meilisearch } from "src/meilisearch";
import type { MeilisearchSearchOptions } from "src/types/MeilisearchSearchOptions";
import { createMeilisearchFake } from "src/meilisearch.fixture";
import type { MeilisearchFakeOptions } from "src/meilisearch.fixture";

const PROFILES = {
  default: {},
  titles: { attributesToSearchOn: ["title"] },
};

const SORTS = {
  relevance: {},
  cheapest: { sort: ["price:asc"] },
};

test("numeric and boolean facets retain their declared value types", async () => {
  const fake = createMeilisearchFake({
    documents: [
      {
        id: "1",
        title: "shoe",
        brand: "acme",
        price: 79,
        tags: [],
        inStock: true,
      },
    ],
  });
  const adapter = meilisearch({
    index: fake.index,
    profiles: PROFILES,
    sorts: SORTS,
    facets: { price: "number", inStock: "boolean" },
  });
  const result = await adapter.search(
    request({ query: "", facets: ["price", "inStock"] }),
    { signal: new AbortController().signal },
  );
  expect(result.facets.price?.values.length).toBeGreaterThan(0);
  expect(
    result.facets.price?.values.every(
      (bucket) => typeof bucket.value === "number",
    ),
  ).toBe(true);
  expect(result.facets.inStock?.values.length).toBeGreaterThan(0);
  expect(
    result.facets.inStock?.values.every(
      (bucket) => typeof bucket.value === "boolean",
    ),
  ).toBe(true);
});

const request = (
  overrides: Partial<AdapterSearchRequest<MeilisearchSearchOptions>> = {},
): AdapterSearchRequest<MeilisearchSearchOptions> => ({
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

type SetupOptions = MeilisearchFakeOptions & {
  pagination?: "page" | "offset";
};

const setup = (options: SetupOptions = {}) => {
  const fake = createMeilisearchFake(options);
  const adapter = meilisearch({
    index: fake.index,
    profiles: PROFILES,
    sorts: SORTS,
    ...(options.pagination === undefined
      ? {}
      : { pagination: options.pagination }),
    ...(options.maxTotalHits === undefined
      ? {}
      : { maxTotalHits: options.maxTotalHits }),
  });
  const search = (
    overrides: Partial<AdapterSearchRequest<MeilisearchSearchOptions>> = {},
    signal: AbortSignal = new AbortController().signal,
  ) => adapter.search(request(overrides), { signal });

  return { adapter, fake, search };
};

type ComparisonOperator = Extract<
  FilterExpression,
  { type: "comparison" }
>["operator"];

const comparison = (
  field: string,
  operator: ComparisonOperator,
  value: unknown,
): FilterExpression => ({ type: "comparison", field, operator, value });

test("an equality filter becomes a quoted Meilisearch comparison", async () => {
  const { fake, search } = setup();

  await search({ filter: comparison("brand", "eq", "Apex") });

  expect(fake.calls[0]?.params?.filter).toBe('brand = "Apex"');
});

test("a value carrying quotes and backslashes is escaped rather than refused", async () => {
  const { fake, search } = setup();
  const hostile = String.raw`Apex "Pro" \ 50% \\ end`;

  await search({ filter: comparison("brand", "eq", hostile) });

  expect(fake.calls[0]?.params?.filter).toBe(
    String.raw`brand = "Apex \"Pro\" \\ 50% \\\\ end"`,
  );
});

test("a value that tries to close the clause stays inside its quotes", async () => {
  const { fake, search } = setup();

  await search({
    filter: comparison("brand", "eq", 'Apex" OR price > 0 OR "'),
  });

  expect(fake.calls[0]?.params?.filter).toBe(
    'brand = "Apex\\" OR price > 0 OR \\""',
  );
});

test("a null comparison becomes Meilisearch's own emptiness operator", async () => {
  const { fake, search } = setup();

  await search({ filter: comparison("brand", "eq", null) });
  await search({ filter: comparison("brand", "neq", null) });

  expect(fake.calls[0]?.params?.filter).toBe("brand IS NULL");
  expect(fake.calls[1]?.params?.filter).toBe("brand IS NOT NULL");
});

test("set membership becomes IN and NOT IN with every value escaped", async () => {
  const { fake, search } = setup();

  await search({ filter: comparison("brand", "in", ["Apex", 'Ve"rtex', 7]) });
  await search({ filter: comparison("brand", "not-in", ["Apex"]) });

  expect(fake.calls[0]?.params?.filter).toBe(
    'brand IN ["Apex", "Ve\\"rtex", 7]',
  );
  expect(fake.calls[1]?.params?.filter).toBe('brand NOT IN ["Apex"]');
});

test("ordering operators become symbols and a range becomes TO", async () => {
  const { fake, search } = setup();

  await search({ filter: comparison("price", "gte", 50) });
  await search({ filter: comparison("price", "lt", 120) });
  await search({ filter: comparison("price", "between", [50, 120]) });

  expect(fake.calls[0]?.params?.filter).toBe("price >= 50");
  expect(fake.calls[1]?.params?.filter).toBe("price < 120");
  expect(fake.calls[2]?.params?.filter).toBe("price 50 TO 120");
});

test("boolean composition parenthesises every child it joins", async () => {
  const { fake, search } = setup();

  await search({
    filter: {
      type: "and",
      expressions: [
        comparison("brand", "eq", "Apex"),
        {
          type: "or",
          expressions: [
            comparison("price", "lt", 100),
            { type: "not", expression: comparison("price", "eq", 20) },
          ],
        },
      ],
    },
  });

  expect(fake.calls[0]?.params?.filter).toBe(
    '(brand = "Apex") AND ((price < 100) OR (NOT (price = 20)))',
  );
});

test("a filter that restricts nothing sends no filter at all", async () => {
  const { fake, search } = setup();

  await search({ filter: { type: "constant", value: true } });

  expect(fake.calls[0]?.params).not.toHaveProperty("filter");
});

test("a contradiction answers with nothing and never reaches the engine", async () => {
  const { fake, search } = setup();

  const response = await search({
    filter: { type: "constant", value: false },
    facets: ["brand"],
  });

  expect(fake.calls).toEqual([]);
  expect(response.hits).toEqual([]);
  expect(response.total).toEqual({
    value: 0,
    accuracy: "exact",
    scope: "matches",
  });
  expect(response.facets.brand).toEqual({
    field: "brand",
    values: [],
    exhaustive: true,
    native: null,
  });
  expect(response.native).toBeNull();
});

test("a false constant inside a conjunction swallows the whole group", async () => {
  const { fake, search } = setup();

  const response = await search({
    filter: {
      type: "and",
      expressions: [
        comparison("brand", "eq", "Apex"),
        { type: "constant", value: false },
      ],
    },
  });

  expect(fake.calls).toEqual([]);
  expect(response.hits).toEqual([]);
});

test("a true constant inside a disjunction leaves the search unfiltered", async () => {
  const { fake, search } = setup();

  await search({
    filter: {
      type: "or",
      expressions: [
        comparison("brand", "eq", "Apex"),
        { type: "constant", value: true },
      ],
    },
  });

  expect(fake.calls[0]?.params).not.toHaveProperty("filter");
});

test("a field name that is not a Meilisearch attribute is refused", async () => {
  const { search } = setup();

  await expect(
    search({ filter: comparison('brand" OR "1', "eq", "Apex") }),
  ).rejects.toThrow(/attribute/);
});

test("a value Meilisearch cannot order is refused rather than guessed at", async () => {
  const { search } = setup();

  await expect(
    search({ filter: comparison("title", "gt", "shoe") }),
  ).rejects.toThrow(/orders numbers/);
});

test("a value Meilisearch cannot compare is refused rather than stringified", async () => {
  const { search } = setup();

  await expect(
    search({ filter: comparison("released", "eq", new Date(0)) }),
  ).rejects.toThrow(/strings, finite numbers and booleans/);
});
