import {
  SearchConfigurationError,
  UnsupportedSearchFeatureError,
} from "@priemskiyyy/scout";
import type {
  AdapterSearchRequest,
  FilterExpression,
} from "@priemskiyyy/scout";
import { expect, test } from "vitest";
import { algolia } from "src/algolia";
import type { AlgoliaSearchClient } from "src/types/AlgoliaSearchClient";
import type { AlgoliaSearchParams } from "src/types/AlgoliaSearchParams";
import { createAlgoliaFake } from "src/algolia.fixture";
import type { AlgoliaFakeOptions } from "src/algolia.fixture";

const SORTS = {
  relevance: { index: { name: "products" } },
  priceAsc: { index: { name: "products_price_asc" } },
};

const PROFILES = {
  default: {},
  strict: { searchParams: { typoTolerance: false } },
};

test("numeric and boolean facets retain their declared value types", async () => {
  const fake = createAlgoliaFake({
    documents: [
      {
        objectID: "1",
        title: "shoe",
        brand: "acme",
        price: 79,
        tags: [],
        inStock: true,
      },
    ],
  });
  const adapter = algolia({
    client: fake.client,
    index: { name: "products" },
    sorts: SORTS,
    profiles: PROFILES,
    facets: { price: "number", inStock: "boolean" },
  });
  const result = await adapter.search(
    request({ query: "shoe", facets: ["price", "inStock"] }),
    { signal: new AbortController().signal },
  );
  expect(result.facets.price?.values).toEqual([{ value: 79, count: 1 }]);
  expect(result.facets.inStock?.values).toEqual([{ value: true, count: 1 }]);
});

test.each([
  "filters",
  "numericFilters",
  "facetFilters",
  "tagFilters",
  "offset",
  "length",
])("profiles cannot override Scout's %s", (key) => {
  const fake = createAlgoliaFake();
  expect(() =>
    algolia({
      client: fake.client,
      index: { name: "products" },
      sorts: SORTS,
      profiles: { default: { searchParams: { [key]: "hidden constraint" } } },
    }),
  ).toThrow(SearchConfigurationError);
  expect(fake.calls).toEqual([]);
});

type AdapterOverrides = {
  cache?: boolean;
  paginationLimitedTo?: number;
};

const adapterFor = (
  client: AlgoliaSearchClient,
  overrides: AdapterOverrides = {},
) =>
  algolia({
    client,
    index: { name: "products" },
    sorts: SORTS,
    profiles: PROFILES,
    ...(typeof overrides.cache === "boolean" ? { cache: overrides.cache } : {}),
    ...(typeof overrides.paginationLimitedTo === "number"
      ? { paginationLimitedTo: overrides.paginationLimitedTo }
      : {}),
  });

const request = (
  overrides: Partial<AdapterSearchRequest<AlgoliaSearchParams>> = {},
): AdapterSearchRequest<AlgoliaSearchParams> => ({
  index: "products",
  query: "running",
  profile: "default",
  sort: "relevance",
  filter: { type: "constant", value: true },
  facets: [],
  highlights: [],
  page: { current: 1, size: 10 },
  provider: null,
  ...overrides,
});

const searchWith = (
  fake: ReturnType<typeof createAlgoliaFake>,
  overrides: Partial<AdapterSearchRequest<AlgoliaSearchParams>> = {},
  adapterOverrides: AdapterOverrides = {},
) =>
  adapterFor(fake.client, adapterOverrides).search(request(overrides), {
    signal: new AbortController().signal,
  });

const paramsOf = (fake: ReturnType<typeof createAlgoliaFake>) =>
  fake.calls[0]?.searchParams;

/** Runs one filter and returns the string Algolia would have been given. */
const filterString = async (
  filter: FilterExpression,
  fakeOptions: AlgoliaFakeOptions = {},
) => {
  const fake = createAlgoliaFake(fakeOptions);
  await searchWith(fake, { filter });
  return paramsOf(fake)?.filters;
};

const comparison = (
  field: string,
  operator: Extract<FilterExpression, { type: "comparison" }>["operator"],
  value: unknown,
): FilterExpression => ({ type: "comparison", field, operator, value });

const failed = (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );

test("it declares what it can actually do, including that it cannot cancel", () => {
  const adapter = adapterFor(createAlgoliaFake().client);

  expect(adapter.name).toBe("algolia");
  expect(adapter.capabilities.pagination.maxPageSize).toBe(1000);
  expect(adapter.capabilities.cancellation).toBe("logical");
  expect(adapter.capabilities.highlights).toBe("parts");
});

test("it reserves every parameter that would overwrite a scout owned field", () => {
  const adapter = adapterFor(createAlgoliaFake().client);

  expect(adapter.reservedOptions).toEqual([
    "filters",
    "query",
    "page",
    "hitsPerPage",
    "facets",
    "attributesToHighlight",
    "highlightPreTag",
    "highlightPostTag",
    "numericFilters",
    "facetFilters",
    "tagFilters",
    "offset",
    "length",
  ]);
});

test("its fingerprint names the primary index and every replica it may read", () => {
  const adapter = adapterFor(createAlgoliaFake().client);

  expect(adapter.fingerprint()).toBe(
    "products relevance=products priceAsc=products_price_asc",
  );
});

test("a named sort reads its replica index rather than a sort parameter", async () => {
  const fake = createAlgoliaFake();

  await searchWith(fake, { sort: "priceAsc" });

  expect(fake.calls[0]?.indexName).toBe("products_price_asc");
  expect(paramsOf(fake)).not.toHaveProperty("sort");
});

test("a sort the adapter was not configured for is a configuration error", async () => {
  const fake = createAlgoliaFake();

  const error = await failed(searchWith(fake, { sort: "newest" }));

  expect(error).toBeInstanceOf(SearchConfigurationError);
  expect(error).toHaveProperty("path", "sorts.newest");
  expect(fake.calls).toHaveLength(0);
});

test("a profile the adapter was not configured for is a configuration error", async () => {
  const fake = createAlgoliaFake();

  const error = await failed(searchWith(fake, { profile: "boosted" }));

  expect(error).toBeInstanceOf(SearchConfigurationError);
  expect(error).toHaveProperty("path", "profiles.boosted");
});

test("a string equality is quoted so its content cannot become syntax", async () => {
  expect(await filterString(comparison("brand", "eq", "acme"))).toBe(
    'brand:"acme"',
  );
});

test("a hostile value keeps its quotes and backslashes as data", async () => {
  expect(await filterString(comparison("brand", "eq", 'Ac"me\\ & Co'))).toBe(
    'brand:"Ac\\"me\\\\ & Co"',
  );
});

test("a value that spells an operator is quoted rather than parsed", async () => {
  expect(await filterString(comparison("brand", "eq", "acme OR bolt"))).toBe(
    'brand:"acme OR bolt"',
  );
});

test("an attribute name that is not a bare identifier is quoted too", async () => {
  expect(await filterString(comparison("brand name", "eq", "acme"))).toBe(
    '"brand name":"acme"',
  );
});

test("a number compares numerically and a boolean reads as a facet", async () => {
  expect(await filterString(comparison("price", "eq", 79))).toBe("price = 79");
  expect(await filterString(comparison("inStock", "eq", true))).toBe(
    "inStock:true",
  );
});

test("a negation uses NOT for text and the numeric operator for numbers", async () => {
  expect(await filterString(comparison("brand", "neq", "acme"))).toBe(
    'NOT brand:"acme"',
  );
  expect(await filterString(comparison("price", "neq", 79))).toBe(
    "price != 79",
  );
});

test("a set becomes a disjunction and its negation a conjunction of negations", async () => {
  expect(await filterString(comparison("brand", "in", ["acme", "bolt"]))).toBe(
    '(brand:"acme" OR brand:"bolt")',
  );
  expect(
    await filterString(comparison("brand", "not-in", ["acme", "bolt"])),
  ).toBe('NOT brand:"acme" AND NOT brand:"bolt"');
  expect(await filterString(comparison("price", "not-in", [1, 2]))).toBe(
    "price != 1 AND price != 2",
  );
});

test("comparisons and ranges use algolia's numeric syntax", async () => {
  expect(await filterString(comparison("price", "gt", 10))).toBe("price > 10");
  expect(await filterString(comparison("price", "gte", 10))).toBe(
    "price >= 10",
  );
  expect(await filterString(comparison("price", "lt", 10))).toBe("price < 10");
  expect(await filterString(comparison("price", "lte", 10))).toBe(
    "price <= 10",
  );
  expect(await filterString(comparison("price", "between", [10, 100]))).toBe(
    "price:10 TO 100",
  );
});

test("only OR groups are parenthesised in Algolia's boolean grammar", async () => {
  expect(
    await filterString({
      type: "and",
      expressions: [
        comparison("brand", "eq", "acme"),
        {
          type: "or",
          expressions: [
            comparison("price", "lt", 50),
            comparison("price", "gt", 100),
          ],
        },
      ],
    }),
  ).toBe('brand:"acme" AND (price < 50 OR price > 100)');
});

test("a single facet is negated without unsupported group parentheses", async () => {
  expect(
    await filterString({
      type: "not",
      expression: comparison("brand", "eq", "acme"),
    }),
  ).toBe('NOT brand:"acme"');
});

test("Algolia refuses boolean combinations its grammar cannot express before dispatch", async () => {
  const filters: FilterExpression[] = [
    {
      type: "not",
      expression: {
        type: "or",
        expressions: [
          comparison("brand", "eq", "a"),
          comparison("brand", "eq", "b"),
        ],
      },
    },
    {
      type: "or",
      expressions: [
        comparison("brand", "eq", "a"),
        {
          type: "and",
          expressions: [
            comparison("brand", "eq", "b"),
            comparison("price", "gt", 10),
          ],
        },
      ],
    },
    {
      type: "or",
      expressions: [
        comparison("brand", "eq", "a"),
        comparison("price", "eq", 10),
      ],
    },
  ];
  for (const filter of filters) {
    const fake = createAlgoliaFake();
    await expect(searchWith(fake, { filter })).rejects.toThrowError(
      UnsupportedSearchFeatureError,
    );
    expect(fake.calls).toEqual([]);
  }
});

test("a comparison against text the engine cannot order is refused", async () => {
  const error = await failed(filterString(comparison("price", "gt", "ten")));

  expect(error).toBeInstanceOf(UnsupportedSearchFeatureError);
  expect(error).toHaveProperty("feature", "filters.gt");
});

test("an equality against a value with no filter spelling is refused", async () => {
  const error = await failed(filterString(comparison("brand", "eq", null)));

  expect(error).toBeInstanceOf(UnsupportedSearchFeatureError);
  expect(error).toHaveProperty("feature", "filters.eq");
});

test("a range missing a bound is refused rather than half applied", async () => {
  const error = await failed(
    filterString(comparison("price", "between", [10])),
  );

  expect(error).toBeInstanceOf(UnsupportedSearchFeatureError);
  expect(error).toHaveProperty("feature", "filters.between");
});

test("a true constant sends no filter at all", async () => {
  const fake = createAlgoliaFake();

  await searchWith(fake);

  expect(paramsOf(fake)).not.toHaveProperty("filters");
});

test("a match all constant inside an or still matches everything", async () => {
  const fake = createAlgoliaFake();

  await searchWith(fake, {
    filter: {
      type: "or",
      expressions: [
        comparison("brand", "eq", "acme"),
        { type: "constant", value: true },
      ],
    },
  });

  expect(paramsOf(fake)).not.toHaveProperty("filters");
});

test("a match none constant inside an and matches nothing", async () => {
  const fake = createAlgoliaFake();

  const response = await searchWith(fake, {
    filter: {
      type: "and",
      expressions: [
        comparison("brand", "eq", "acme"),
        { type: "constant", value: false },
      ],
    },
  });

  expect(fake.calls).toHaveLength(0);
  expect(response.hits).toEqual([]);
});

test("a neutral constant inside a group leaves the other term alone", async () => {
  expect(
    await filterString({
      type: "and",
      expressions: [
        comparison("brand", "eq", "acme"),
        { type: "constant", value: true },
      ],
    }),
  ).toBe('brand:"acme"');
});

test("a false constant answers empty without paying for a query", async () => {
  const fake = createAlgoliaFake();

  const response = await searchWith(fake, {
    filter: { type: "constant", value: false },
    facets: ["brand"],
  });

  expect(fake.calls).toHaveLength(0);
  expect(response.hits).toEqual([]);
  // Zero matches is a count of matches rather than of what pagination could
  // reach, and a contradiction leaves nothing to be uncertain about.
  expect(response.total).toEqual({
    value: 0,
    accuracy: "exact",
    scope: "matches",
  });
  expect(response.native).toBeNull();
  expect(response.facets.brand).toEqual({
    field: "brand",
    values: [],
    exhaustive: true,
    native: null,
  });
});

test("scout page one is sent as algolia page zero", async () => {
  const fake = createAlgoliaFake();

  const response = await searchWith(fake, { page: { current: 1, size: 2 } });

  expect(paramsOf(fake)?.page).toBe(0);
  expect(paramsOf(fake)?.hitsPerPage).toBe(2);
  expect(response.page.current).toBe(1);
  expect(response.page.previous).toBeNull();
});

test("a later page is translated back into scout's numbering", async () => {
  const fake = createAlgoliaFake();

  const response = await searchWith(fake, {
    page: { current: 2, size: 2 },
    query: "",
  });

  expect(paramsOf(fake)?.page).toBe(1);
  expect(response.page.current).toBe(2);
  expect(response.page.previous).toBe(1);
  expect(response.page.next).toBe(3);
});

test("pagination stops at the last page the limit can reach", async () => {
  const fake = createAlgoliaFake({ pagination: { nbHits: 100, nbPages: 50 } });

  const response = await searchWith(
    fake,
    { page: { current: 2, size: 2 }, query: "" },
    { paginationLimitedTo: 4 },
  );

  expect(response.page.next).toBeNull();
});

test("matches past the limit are counted as matches, not as retrievable", async () => {
  const fake = createAlgoliaFake({ pagination: { nbHits: 100, nbPages: 50 } });

  const response = await searchWith(
    fake,
    { page: { current: 1, size: 2 }, query: "" },
    { paginationLimitedTo: 4 },
  );

  expect(response.total).toEqual({
    value: 100,
    accuracy: "exact",
    scope: "matches",
  });
  expect(response.page.next).toBe(2);
});

test("an approximated count is reported as estimated", async () => {
  const fake = createAlgoliaFake({ exhaustive: { nbHits: false } });

  const response = await searchWith(fake, { query: "" });

  expect(response.total).toEqual({
    value: 5,
    accuracy: "estimated",
    scope: "retrievable",
  });
});

test("a count algolia said nothing about is unknown, not exact", async () => {
  const fake = createAlgoliaFake({ exhaustive: null });

  const response = await searchWith(fake, { query: "" });

  expect(response.total).toEqual({ accuracy: "unknown", scope: "retrievable" });
});

test("a response with no counts at all keeps its uncertainty", async () => {
  const bare: AlgoliaSearchClient = {
    searchSingleIndex: () => Promise.resolve({ hits: [] }),
    searchSingleIndexWithHTTPInfo: () =>
      Promise.resolve({ data: { hits: [] } }),
  };

  const response = await adapterFor(bare).search(request(), {
    signal: new AbortController().signal,
  });

  expect(response.total).toEqual({ accuracy: "unknown", scope: "unknown" });
  expect(response.page.next).toBe("unknown");
  expect(response.took).toBeNull();
});

test("facet buckets carry their counts and algolia's own exhaustiveness", async () => {
  const fake = createAlgoliaFake();

  const response = await searchWith(fake, { query: "", facets: ["brand"] });

  expect(paramsOf(fake)?.facets).toEqual(["brand"]);
  expect(response.facets.brand?.values).toEqual([
    { value: "acme", count: 2 },
    { value: "bolt", count: 1 },
    { value: "mug co", count: 1 },
    { value: "forge", count: 1 },
  ]);
  expect(response.facets.brand?.exhaustive).toBe(true);
});

test("a facet algolia said nothing about is unknown rather than exhaustive", async () => {
  const fake = createAlgoliaFake({ exhaustive: { nbHits: true } });

  const response = await searchWith(fake, { query: "", facets: ["brand"] });

  expect(response.facets.brand?.exhaustive).toBe("unknown");
});
