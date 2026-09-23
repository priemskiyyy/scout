import { Scout } from "@priemskiyyy/scout";
import type {
  AdapterSearchRequest,
  FilterExpression,
} from "@priemskiyyy/scout";
import { matchesFilter } from "@priemskiyyy/scout/adapter";
import { expect, test } from "vitest";

import { mongodb } from "src/mongodb";
import { createMongoFake, productIndex } from "src/mongodb.fixture";
import type { MongoFakeOptions } from "src/mongodb.fixture";
import type { MongoSearchAdapterOptions } from "src/types/MongoSearchAdapterOptions";
import type { MongoSearchCollection } from "src/types/MongoSearchCollection";
import type { MongoSearchOptions } from "src/types/MongoSearchOptions";

const TOKENS = ["brand", "category", "tags"];

const setup = (
  options: MongoFakeOptions = {},
  adapterOptions: Omit<MongoSearchAdapterOptions, "collection"> = {},
) => {
  const fake = createMongoFake(options);

  const adapter = mongodb({
    collection: fake.collection,
    tokens: TOKENS,
    ...adapterOptions,
  });

  return { fake, adapter };
};

const getRequest = (
  overrides: Partial<AdapterSearchRequest<MongoSearchOptions>> = {},
): AdapterSearchRequest<MongoSearchOptions> => ({
  index: "products",
  query: "shoe",
  searchable: ["name", "brand"],
  profile: "default",
  sort: null,
  filter: null,
  facets: [],
  highlights: [],
  page: { current: 1, size: 10 },
  provider: null,
  ...overrides,
});

const search = async (
  overrides: Partial<AdapterSearchRequest<MongoSearchOptions>> = {},
  options: MongoFakeOptions = {},
  adapterOptions: Omit<MongoSearchAdapterOptions, "collection"> = {},
) => {
  const { fake, adapter } = setup(options, adapterOptions);

  const response = await adapter.search(getRequest(overrides), {
    signal: new AbortController().signal,
  });

  return { response, sent: fake.calls[0] };
};

const getScout = (options: MongoFakeOptions = {}) => {
  const { fake, adapter } = setup(options);

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

test("creating the adapter asks nothing of the collection", () => {
  const collection: MongoSearchCollection = {
    get dbName(): string {
      throw new Error("The collection was used.");
    },
    get collectionName(): string {
      throw new Error("The collection was used.");
    },
    aggregate: () => {
      throw new Error("The collection was used.");
    },
  };

  expect(() => mongodb({ collection })).not.toThrow();
});

test("a search reaches the search index with the profile's fields", async () => {
  const { response, sent } = await search(
    { searchable: ["name"], profile: "names" },
    { index: "products" },
    { index: "products" },
  );

  expect(sent?.[0]).toEqual({
    $search: {
      index: "products",
      compound: { must: [{ text: { query: "shoe", path: ["name"] } }] },
      count: { type: "lowerBound" },
    },
  });
  expect(response.hits.map((hit) => hit.native._id)).toEqual([
    "p1",
    "p2",
    "p3",
  ]);
});

test("the signal reaches the collection", async () => {
  const { fake, adapter } = setup();
  const controller = new AbortController();

  await adapter.search(getRequest(), { signal: controller.signal });

  expect(fake.signals[0]).toBe(controller.signal);
});

test.each([
  ["a number facet, which needs boundaries", { facets: ["price"] }],
  [
    "a boolean facet, which MongoDB Search has no type for",
    { facets: ["inStock"] },
  ],
  [
    "a string equality on a field not indexed as token",
    {
      filter: {
        type: "comparison",
        field: "name",
        operator: "eq",
        value: "Rain jacket",
      },
    },
  ],
  [
    "a string set on a field not indexed as token",
    {
      filter: {
        type: "comparison",
        field: "name",
        operator: "not-in",
        value: ["Rain jacket"],
      },
    },
  ],
  [
    "a set mixing value types",
    {
      filter: {
        type: "comparison",
        field: "tags",
        operator: "in",
        value: ["sport", 1],
      },
    },
  ],
] satisfies [string, Partial<AdapterSearchRequest<MongoSearchOptions>>][])(
  "%s is refused before anything is sent",
  async (_what, overrides) => {
    const { fake, adapter } = setup();

    await expect(
      adapter.search(getRequest(overrides), {
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ code: "unsupported-feature" });
    expect(fake.calls).toHaveLength(0);
  },
);

test.each(["index", "compound", "facet", "count", "highlight", "sort"])(
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

test("the fingerprint is the namespace and the search index", () => {
  expect(setup().adapter.fingerprint()).toBe("shop.products/default");
  expect(setup({}, { index: "catalogue" }).adapter.fingerprint()).toBe(
    "shop.products/catalogue",
  );
});

test("the rows and their score are kept, and there is no engine time", async () => {
  const { response } = await search();

  expect(response.took).toBeNull();
  expect(response.native).toHaveLength(3);
  expect(response.hits[0]?.native).toBe(response.native[0]);
  expect(response.hits[0]?.native.__scout.score).toBeGreaterThan(0);
  expect(response.hits[0]?.document).not.toHaveProperty("__scout");
});

test("a total counted exactly is exact, and exactTotals asks for one", async () => {
  const lowerBound = await search();
  const total = await search({}, {}, { exactTotals: true });

  expect(lowerBound.response.total).toEqual({
    value: 3,
    accuracy: "exact",
    scope: "matches",
  });
  expect(total.sent?.[0]).toMatchObject({
    $search: { count: { type: "total" } },
  });
  expect(total.response.total).toEqual({
    value: 3,
    accuracy: "exact",
    scope: "matches",
  });
});

test("a lower bound past its threshold is reported as one", async () => {
  const { response } = await search(
    {},
    {
      respond: (rows) =>
        rows.map((row) => ({
          ...row,
          __scout: { ...row.__scout, meta: { count: { lowerBound: 4000 } } },
        })),
    },
  );

  expect(response.total).toEqual({
    value: 4000,
    accuracy: "lower-bound",
    scope: "matches",
  });
});

test("a page past the last match has no count and no next page", async () => {
  const result = await getScout()
    .products.search("shoe")
    .page({ current: 5, size: 10 })
    .execute();

  expect(result.hits).toEqual([]);
  expect(result.total.accuracy).toBe("unknown");
  expect(result.page.next).toBeNull();
});

test("facets come back counted over every match", async () => {
  const result = await getScout()
    .products.search("shoe")
    .facets("brand", "category")
    .execute();

  expect(result.facets.brand.values).toEqual([
    { value: "Nimbus", count: 2 },
    { value: "Halden", count: 1 },
  ]);
  expect(result.facets.category.values).toEqual([{ value: "shoes", count: 3 }]);
  expect(result.facets.brand.exhaustive).toBe("unknown");
});

test("a highlight comes back as parts", async () => {
  const result = await getScout()
    .products.search("shoe")
    .highlight("name")
    .execute();

  expect(result.hits[0]?.highlights.name).toEqual([
    {
      path: ["name"],
      truncated: "unknown",
      parts: [
        { text: "Trail running ", matched: false },
        { text: "shoe", matched: true },
      ],
    },
  ]);
});

test("a sort orders every match before the page is cut", async () => {
  const result = await getScout()
    .products.search("")
    .sort("priceAsc")
    .page({ size: 2 })
    .execute();

  expect(result.hits.map((hit) => hit.id)).toEqual(["p4", "p1"]);
});

test("a negation inside an or keeps its meaning", async () => {
  const filter: FilterExpression = {
    type: "or",
    expressions: [
      {
        type: "not",
        expression: {
          type: "comparison",
          field: "brand",
          operator: "eq",
          value: "Nimbus",
        },
      },
      { type: "comparison", field: "price", operator: "lt", value: 130 },
    ],
  };

  const result = await getScout()
    .products.search("")
    .where(() => filter)
    .execute();

  expect(result.hits.map((hit) => hit.id)).toEqual(["p1", "p3", "p4", "p5"]);

  for (const hit of result.hits) {
    expect(matchesFilter(filter, hit.document)).toBe(true);
  }
});

test("a failing collection reaches the caller as a provider error keeping its cause", async () => {
  const cause = new Error("connection refused");

  const error = await getRejection(
    getScout({ fail: cause }).products.search("shoe").execute(),
  );

  expect(error).toMatchObject({ code: "provider", cause });
});
