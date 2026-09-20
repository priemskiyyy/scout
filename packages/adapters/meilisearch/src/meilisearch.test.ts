import { expect, test } from "vitest";
import type {
  AdapterSearchRequest,
  FilterExpression,
} from "@priemskiyyy/scout";
import { meilisearch } from "src/meilisearch";
import type { MeilisearchIndexClient } from "src/types/MeilisearchIndexClient";
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

test("page mode asks for a page and reports an exhaustive total", async () => {
  const { fake, search } = setup();

  const response = await search({ page: { current: 2, size: 2 } });

  expect(fake.calls[0]?.params).toMatchObject({ page: 2, hitsPerPage: 2 });
  expect(fake.calls[0]?.params).not.toHaveProperty("offset");
  expect(response.total).toEqual({
    value: 5,
    accuracy: "exact",
    scope: "matches",
  });
  expect(response.page).toEqual({
    kind: "page",
    current: 2,
    size: 2,
    next: 3,
    previous: 1,
  });
});

test("the last page of page mode reports no next page", async () => {
  const { search } = setup();

  const response = await search({ page: { current: 3, size: 2 } });

  expect(response.page.next).toBeNull();
});

test("a total that reaches maxTotalHits is a cap, not a count", async () => {
  const { search } = setup({ maxTotalHits: 2 });

  const response = await search();

  expect(response.total).toEqual({
    value: 2,
    accuracy: "lower-bound",
    scope: "retrievable",
  });
});

test("offset mode asks by offset and never calls its estimate exact", async () => {
  const { fake, search } = setup({ pagination: "offset" });

  const response = await search({ page: { current: 2, size: 2 } });

  expect(fake.calls[0]?.params).toMatchObject({ offset: 2, limit: 2 });
  expect(fake.calls[0]?.params).not.toHaveProperty("page");
  expect(response.total).toEqual({
    value: 5,
    accuracy: "estimated",
    scope: "matches",
  });
});

test("offset mode admits it cannot tell whether a full page has a next", async () => {
  const { search } = setup({ pagination: "offset" });

  const full = await search({ page: { current: 1, size: 2 } });
  const short = await search({ page: { current: 3, size: 2 } });

  expect(full.page.next).toBe("unknown");
  expect(short.page.next).toBeNull();
});

test("a response with no pagination block reports an unknown total", async () => {
  const index: MeilisearchIndexClient = {
    uid: "products",
    search: () => Promise.resolve({ hits: [], processingTimeMs: 3 }),
  };
  const adapter = meilisearch({ index, profiles: PROFILES, sorts: SORTS });

  const response = await adapter.search(request(), {
    signal: new AbortController().signal,
  });

  expect(response.total).toEqual({ accuracy: "unknown", scope: "unknown" });
  expect(response.page.next).toBe("unknown");
});

test("highlight parts line up with text outside the Basic Multilingual Plane", async () => {
  const title = "Café Zürich 日本語 🚀 shoe";
  const { search } = setup();

  for (const term of ["café", "日本語", "🚀"]) {
    const response = await search({ query: term, highlights: ["title"] });
    const fragment = response.hits[0]?.highlights.title?.[0];
    const matched = fragment?.parts.filter((part) => part.matched) ?? [];

    expect(fragment?.parts.map((part) => part.text).join("")).toBe(title);
    expect(matched.map((part) => part.text)).toEqual([
      term === "café" ? "Café" : term,
    ]);
    expect(fragment?.path).toEqual(["title"]);
    expect(fragment?.truncated).toBe(false);
  }
});

test("an emoji is highlighted whole rather than split into surrogates", async () => {
  const { search } = setup();

  const response = await search({ query: "🚀", highlights: ["title"] });
  const parts = response.hits[0]?.highlights.title?.[0]?.parts ?? [];
  const matched = parts.find((part) => part.matched)?.text ?? "";

  expect([...matched]).toEqual(["🚀"]);
  expect(matched.length).toBe(2);
});

test("a document carrying marker shaped text cannot forge a highlight", async () => {
  const { search } = setup();

  const response = await search({ query: "injected", highlights: ["title"] });
  const parts = response.hits[0]?.highlights.title?.[0]?.parts ?? [];

  expect(parts).toEqual([
    { text: "[scout:forged]", matched: false },
    { text: "injected", matched: true },
    { text: "[/scout:forged] shoe", matched: false },
  ]);
});

test("the markers change between searches, so no document can hold one", async () => {
  const { fake, search } = setup();

  await search({ highlights: ["title"] });
  await search({ highlights: ["title"] });

  expect(fake.calls[0]?.params?.highlightPreTag).toMatch(/^\[scout:.+\]$/);
  expect(fake.calls[0]?.params?.highlightPreTag).not.toBe(
    fake.calls[1]?.params?.highlightPreTag,
  );
});

test("the adapter never asks for the byte offsets in _matchesPosition", async () => {
  const { fake, search } = setup();

  await search({ highlights: ["title"] });

  expect(fake.calls[0]?.params).not.toHaveProperty("showMatchesPosition");
});

test("an array field reports one fragment per element with its position", async () => {
  const { search } = setup();

  const response = await search({ query: "running", highlights: ["tags"] });
  const fragments = response.hits[0]?.highlights.tags ?? [];

  expect(fragments.map((fragment) => fragment.path)).toEqual([
    ["tags", 0],
    ["tags", 1],
  ]);
  expect(fragments[0]?.parts).toEqual([{ text: "running", matched: true }]);
});

test("a formatted value with a marker it never closes degrades to plain text", async () => {
  const index: MeilisearchIndexClient = {
    uid: "products",
    search: (_query, params) =>
      Promise.resolve({
        hits: [
          {
            id: "1",
            title: "broken",
            _formatted: { title: `${params?.highlightPreTag}broken` },
          },
        ],
        processingTimeMs: 1,
        totalHits: 1,
        totalPages: 1,
        page: 1,
        hitsPerPage: 10,
      }),
  };
  const adapter = meilisearch({ index, profiles: PROFILES, sorts: SORTS });

  const response = await adapter.search(request({ highlights: ["title"] }), {
    signal: new AbortController().signal,
  });

  expect(response.hits[0]?.highlights.title?.[0]?.parts).toEqual([
    { text: "broken", matched: false },
  ]);
});

test("a requested facet carries its distribution, its stats and no claim of completeness", async () => {
  const { search } = setup();

  const response = await search({ facets: ["brand", "price"] });

  expect(response.facets.brand).toEqual({
    field: "brand",
    values: [
      { value: "Apex", count: 2 },
      { value: "Vertex", count: 2 },
      { value: "Forge", count: 1 },
    ],
    exhaustive: "unknown",
    native: {
      distribution: { Apex: 2, Vertex: 2, Forge: 1 },
      stats: null,
    },
  });
  expect(response.facets.price?.native).toEqual({
    distribution: { "120": 1, "90": 1, "150": 1, "60": 1, "45": 1 },
    stats: { min: 45, max: 150 },
  });
});

test("a named sort becomes the Meilisearch sort array", async () => {
  const { fake, search } = setup();

  await search({ sort: "cheapest" });

  expect(fake.calls[0]?.params?.sort).toEqual(["price:asc"]);
});

test("a profile's options reach the engine rather than being advertised only", async () => {
  const { fake, search } = setup();

  const response = await search({ profile: "titles", query: "Apex" });

  expect(fake.calls[0]?.params?.attributesToSearchOn).toEqual(["title"]);
  expect(response.hits).toEqual([]);
});

test("provider options are merged over the profile they extend", async () => {
  const { fake, search } = setup();

  await search({
    profile: "titles",
    provider: { attributesToSearchOn: ["brand"], matchingStrategy: "all" },
  });

  expect(fake.calls[0]?.params).toMatchObject({
    attributesToSearchOn: ["brand"],
    matchingStrategy: "all",
  });
});

test("the adapter names every key that would collide with a Scout owned field", () => {
  const { adapter } = setup();

  expect(adapter.reservedOptions).toEqual([
    "filter",
    "q",
    "page",
    "hitsPerPage",
    "offset",
    "limit",
    "sort",
    "facets",
    "attributesToHighlight",
    "highlightPreTag",
    "highlightPostTag",
  ]);
});

test("the query travels in the first argument, never as a parameter", async () => {
  const { fake, search } = setup();

  await search({ query: "shoe" });

  expect(fake.calls[0]?.query).toBe("shoe");
  expect(fake.calls[0]?.params).not.toHaveProperty("q");
});

test("the fingerprint is the index uid and carries no credential", () => {
  const { adapter } = setup({ uid: "products" });

  expect(adapter.fingerprint()).toBe("products");
  expect(adapter.fingerprint()).not.toMatch(/key|secret|token/i);
});

test("the engine's own processing time is reported as took", async () => {
  const { search } = setup({ processingTimeMs: 42 });

  const response = await search();

  expect(response.took).toBe(42);
});

test("the signal reaches the SDK, which is what transport cancellation means", async () => {
  const { adapter, fake, search } = setup();
  const controller = new AbortController();

  await search({}, controller.signal);

  expect(fake.calls[0]?.signal).toBe(controller.signal);
  expect(adapter.capabilities.cancellation).toBe("transport");
});

test("the document loses Meilisearch's own keys while the raw hit is kept", async () => {
  const { search } = setup();

  const response = await search({ query: "sock", highlights: ["title"] });
  const hit = response.hits[0];

  expect(hit?.document).toEqual({
    id: "6",
    title: "Wool sock",
    brand: "Apex",
    price: 20,
    tags: ["wool"],
  });
  expect(hit?.native).toHaveProperty("_formatted");
});

test("a profile or sort the adapter was not configured with is refused", async () => {
  const { search } = setup();

  // The refusal lists what was configured, because the gap is in this
  // adapter's own configuration and the names are the fix.
  await expect(search({ profile: "unknown" })).rejects.toThrow(
    /no unknown entry in its profiles.*configured with default, titles/,
  );
  await expect(search({ sort: "unknown" })).rejects.toThrow(
    /no unknown entry in its sorts.*configured with relevance, cheapest/,
  );
});
