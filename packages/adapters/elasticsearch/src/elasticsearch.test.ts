import { Scout } from "@priemskiyyy/scout";
import type { AdapterSearchRequest } from "@priemskiyyy/scout";
import type { ElasticSearchOptions } from "@priemskiyyy/scout-elastic-dsl";
import { expect, test } from "vitest";

import { elasticsearch } from "src/elasticsearch";
import {
  createElasticsearchFake,
  productIndex,
} from "src/elasticsearch.fixture";
import type { ElasticsearchFakeOptions } from "src/elasticsearch.fixture";
import type { ElasticsearchAdapterOptions } from "src/types/ElasticsearchAdapterOptions";
import type { ElasticsearchSearchClient } from "src/types/ElasticsearchSearchClient";

type Settings = Omit<ElasticsearchAdapterOptions, "client" | "index">;

const KEYWORDS = { brand: "brand.keyword" };

const setup = (
  options: ElasticsearchFakeOptions = {},
  settings: Settings = { keywords: KEYWORDS },
) => {
  const fake = createElasticsearchFake(options);

  const adapter = elasticsearch({
    client: fake.client,
    index: "products",
    ...settings,
  });

  return { fake, adapter };
};

const getRequest = (
  overrides: Partial<AdapterSearchRequest<ElasticSearchOptions>> = {},
): AdapterSearchRequest<ElasticSearchOptions> => ({
  index: "products",
  query: "shoe",
  searchable: ["name", "brand", "tags"],
  profile: "default",
  sort: null,
  filter: null,
  facets: [],
  highlights: [],
  page: { current: 1, size: 10 },
  provider: null,
  ...overrides,
});

const getScout = (
  options: ElasticsearchFakeOptions = {},
  settings: Settings = { keywords: KEYWORDS },
) => {
  const { fake, adapter } = setup(options, settings);

  const scout = new Scout({
    indexes: { products: productIndex },
    adapters: { products: adapter },
  });

  return { fake, products: scout.index("products") };
};

const getRejection = async (pending: Promise<unknown>) => {
  try {
    await pending;
  } catch (error) {
    return error;
  }

  throw new Error("The search answered.");
};

test("creating the adapter asks nothing of the client", () => {
  const client: ElasticsearchSearchClient = {
    search: () => {
      throw new Error("The client was used.");
    },
  };

  expect(() => elasticsearch({ client, index: "products" })).not.toThrow();
});

test("a search reaches the index with the body at the top level, beside the signal", async () => {
  const { fake, adapter } = setup();
  const controller = new AbortController();

  await adapter.search(getRequest({ page: { current: 2, size: 5 } }), {
    signal: controller.signal,
  });

  expect(fake.calls[0]).toEqual({
    index: "products",
    query: {
      bool: {
        must: [
          {
            multi_match: { query: "shoe", fields: ["name", "brand", "tags"] },
          },
        ],
      },
    },
    from: 5,
    size: 5,
  });
  expect(fake.signals[0]).toBe(controller.signal);
});

test("provider options reach the request", async () => {
  const { fake, products } = getScout();

  await products.search("shoe").provider({ min_score: 1.5 }).execute();

  expect(fake.calls[0]).toMatchObject({ min_score: 1.5 });
});

test.each([
  ["the default window", {}, { current: 501, size: 20 }],
  ["a configured window", { maxResultWindow: 50 }, { current: 3, size: 20 }],
] satisfies [string, Settings, { current: number; size: number }][])(
  "a page past %s is refused before anything is sent",
  async (_what, settings, page) => {
    const { fake, adapter } = setup({}, settings);

    await expect(
      adapter.search(getRequest({ page }), {
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ code: "unsupported-feature" });
    expect(fake.calls).toHaveLength(0);
  },
);

test("a page that ends exactly at the window is sent, and paging ends there", async () => {
  const { fake, adapter } = setup({}, { maxResultWindow: 50 });

  const response = await adapter.search(
    getRequest({ page: { current: 2, size: 25 } }),
    { signal: new AbortController().signal },
  );

  expect(fake.calls).toHaveLength(1);
  expect(response.retrievable).toBe(50);
});

test("paging stops at the window while the total still counts every match", async () => {
  const result = await getScout({}, { maxResultWindow: 2 })
    .products.search("shoe")
    .page({ current: 2, size: 1 })
    .execute();

  expect(result.total).toEqual({
    value: 3,
    accuracy: "exact",
    scope: "matches",
  });
  expect(result.page.next).toBeNull();
});

test.each([
  "query",
  "from",
  "sort",
  "aggs",
  "track_total_hits",
  "index",
  "body",
])(
  "a provider option Scout writes, %s, is refused before anything is sent",
  async (key) => {
    const { fake, products } = getScout();

    await expect(
      products
        .search("shoe")
        .provider(Object.fromEntries([[key, "x"]]))
        .execute(),
    ).rejects.toMatchObject({
      code: "configuration",
      message: `provider.${key} is written by Scout from the search itself.`,
    });
    expect(fake.calls).toHaveLength(0);
  },
);

test("an exact count is asked for only when trackTotalHits is on", async () => {
  const tracked = setup({}, { trackTotalHits: true });
  const untracked = setup();

  await tracked.adapter.search(getRequest(), {
    signal: new AbortController().signal,
  });
  await untracked.adapter.search(getRequest(), {
    signal: new AbortController().signal,
  });

  expect(tracked.fake.calls[0]?.track_total_hits).toBe(true);
  expect(untracked.fake.calls[0]).not.toHaveProperty("track_total_hits");
});

test("a count the engine stopped is a lower bound", async () => {
  const result = await getScout({
    respond: (response) => ({
      ...response,
      hits: { ...response.hits, total: { value: 10_000, relation: "gte" } },
    }),
  })
    .products.search("shoe")
    .execute();

  expect(result.total).toEqual({
    value: 10_000,
    accuracy: "lower-bound",
    scope: "matches",
  });
});

test("the engine's own time, the raw hits and the raw response are kept", async () => {
  const { adapter } = setup();

  const response = await adapter.search(getRequest(), {
    signal: new AbortController().signal,
  });

  expect(response.took).toBe(3);
  expect(response.hits[0]?.native).toMatchObject({ _id: "1", _score: 1 });
  expect(response.native).toHaveProperty("_shards");
});

test("the fingerprint is the index", () => {
  expect(setup().adapter.fingerprint()).toBe("products");
});

test("a field keywords names is filtered and faceted on its exact field", async () => {
  const { fake, products } = getScout();

  const result = await products
    .search("")
    .where((fields) => fields.brand.eq("Nimbus"))
    .facets("brand", "tags")
    .execute();

  expect(result.hits.map((hit) => hit.id)).toEqual(["1", "2"]);
  expect(result.facets.brand.values).toEqual([{ value: "Nimbus", count: 2 }]);
  expect(result.facets.tags.values).toEqual([
    { value: "shoe", count: 2 },
    { value: "sport", count: 2 },
  ]);
  expect(fake.calls[0]?.aggs).toEqual({
    brand: { terms: { field: "brand.keyword" } },
    tags: { terms: { field: "tags" } },
  });
});

// This is what keywords is for: a term on a text field meets its analysed
// tokens, so an exact value finds nothing, and the engine refuses to count
// one.
test("without its keyword field, a text field matches no exact value and cannot be counted", async () => {
  const { products } = getScout({}, {});

  const result = await products
    .search("")
    .where((fields) => fields.brand.eq("Nimbus"))
    .execute();

  expect(result.hits).toHaveLength(0);

  const error = await getRejection(
    products.search("").facets("brand").execute(),
  );

  expect(error).toMatchObject({ code: "provider" });
});

test("facet values come out as the types the index declared", async () => {
  const result = await getScout()
    .products.search("shoe")
    .facets("price", "inStock")
    .execute();

  expect(result.facets.price.values).toContainEqual({ value: 120, count: 1 });
  expect(result.facets.inStock.values).toEqual([
    { value: true, count: 2 },
    { value: false, count: 1 },
  ]);
  expect(result.facets.inStock.exhaustive).toBe(true);
});

test("a highlight comes back whole, split into parts on this search's markers", async () => {
  const { fake, products } = getScout();

  const result = await products.search("shoe").highlight("name").execute();

  await products.search("shoe").highlight("name").execute();

  const [first, second] = fake.calls.map((call) => call.highlight);

  expect(first?.pre_tags[0]).not.toBe(second?.pre_tags[0]);
  expect(first?.fields).toEqual({ name: { number_of_fragments: 0 } });
  expect(result.hits[0]?.highlights.name).toEqual([
    {
      path: ["name"],
      parts: [
        { text: "Trail running ", matched: false },
        { text: "shoe", matched: true },
      ],
      truncated: false,
    },
  ]);
});

test("a failing client reaches the caller as a provider error keeping its cause", async () => {
  const cause = new Error("connection refused");

  const error = await getRejection(
    getScout({ fail: cause }).products.search("shoe").execute(),
  );

  expect(error).toMatchObject({ code: "provider", cause });
});
