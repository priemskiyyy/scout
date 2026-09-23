import { Scout } from "@priemskiyyy/scout";
import type {
  AdapterSearchRequest,
  AdapterSort,
  FilterExpression,
} from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import { algolia } from "src/algolia";
import { createAlgoliaFake, productIndex } from "src/algolia.fixture";
import type { AlgoliaFakeOptions } from "src/algolia.fixture";
import type { AlgoliaAdapterOptions } from "src/types/AlgoliaAdapterOptions";
import type { AlgoliaSearchClient } from "src/types/AlgoliaSearchClient";
import type { AlgoliaSearchOptions } from "src/types/AlgoliaSearchOptions";

type AdapterOverrides = Partial<
  Pick<AlgoliaAdapterOptions, "cache" | "paginationLimitedTo">
>;

const setup = (
  fakeOptions: AlgoliaFakeOptions = {},
  overrides: AdapterOverrides = {},
) => {
  const fake = createAlgoliaFake(fakeOptions);

  const adapter = algolia({
    client: fake.client,
    indexName: "products",
    replicas: { priceAsc: "products_price_asc" },
    profiles: { titles: { typoTolerance: false } },
    ...overrides,
  });

  return { fake, adapter };
};

const getRequest = (
  overrides: Partial<AdapterSearchRequest<AlgoliaSearchOptions>> = {},
): AdapterSearchRequest<AlgoliaSearchOptions> => ({
  index: "products",
  query: "running",
  searchable: ["title", "brand"],
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
  overrides: Partial<AdapterSearchRequest<AlgoliaSearchOptions>> = {},
  fakeOptions: AlgoliaFakeOptions = {},
  adapterOverrides: AdapterOverrides = {},
) => {
  const { fake, adapter } = setup(fakeOptions, adapterOverrides);

  const response = await adapter.search(getRequest(overrides), {
    signal: new AbortController().signal,
  });

  return { response, call: fake.calls[0] };
};

const getScout = (
  fakeOptions: AlgoliaFakeOptions = {},
  overrides: AdapterOverrides = {},
) => {
  const { fake, adapter } = setup(fakeOptions, overrides);

  const scout = new Scout({
    indexes: { products: productIndex },
    adapters: { products: adapter },
  });

  return { fake, products: scout.index("products") };
};

const PRICE_ASC: AdapterSort = {
  name: "priceAsc",
  by: [{ field: "price", direction: "asc" }],
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
  const unusable = () => {
    throw new Error("The client was used.");
  };

  const client: AlgoliaSearchClient = {
    searchSingleIndex: unusable,
    searchSingleIndexWithHTTPInfo: unusable,
  };

  expect(() => algolia({ client, indexName: "products" })).not.toThrow();
});

test("a profile that sets a parameter Scout writes is refused when the adapter is made", () => {
  const fake = createAlgoliaFake();

  expect(() =>
    algolia({
      client: fake.client,
      indexName: "products",
      profiles: {
        strict: Object.fromEntries([["filters", "hidden constraint"]]),
      },
    }),
  ).toThrowError(
    expect.objectContaining({
      code: "configuration",
      message:
        "profiles.strict.filters is written by Scout from the search itself.",
    }),
  );
  expect(fake.calls).toEqual([]);
});

test("the fingerprint names the primary index and every replica it may read", () => {
  expect(setup().adapter.fingerprint()).toBe(
    "products priceAsc=products_price_asc",
  );
});

test("relevance reads the primary index, and a sort reads its replica", async () => {
  const relevance = await search();
  const sorted = await search({ sort: PRICE_ASC });

  expect(relevance.call?.indexName).toBe("products");
  expect(sorted.call?.indexName).toBe("products_price_asc");
  expect(sorted.call?.searchParams).not.toHaveProperty("sort");
});

test("an index whose sorts have no replicas is refused where the Scout is built", () => {
  const adapter = algolia({
    client: createAlgoliaFake().client,
    indexName: "products",
  });

  expect(adapter.sorts).toEqual({});
  expect(
    () =>
      new Scout({
        indexes: { products: productIndex },
        // @ts-expect-error the adapter has no replica for priceAsc
        adapters: { products: adapter },
      }),
  ).toThrowError(expect.objectContaining({ code: "configuration" }));
});

test.each([
  [
    "a sort with no replica",
    {
      sort: { name: "newest", by: [{ field: "date", direction: "desc" }] },
    },
    "configuration",
  ],
  [
    "a filter Algolia's grammar cannot say",
    {
      filter: {
        type: "not",
        expression: {
          type: "comparison",
          field: "price",
          operator: "between",
          value: [10, 20],
        },
      } satisfies FilterExpression,
    },
    "unsupported-feature",
  ],
  [
    "a page larger than Algolia returns",
    { page: { current: 1, size: 1001 } },
    "unsupported-feature",
  ],
] satisfies [
  string,
  Partial<AdapterSearchRequest<AlgoliaSearchOptions>>,
  string,
][])(
  "%s is refused before anything is sent",
  async (_what, overrides, code) => {
    const { fake, adapter } = setup();

    await expect(
      adapter.search(getRequest(overrides), {
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ code });
    expect(fake.calls).toEqual([]);
  },
);

test.each([
  "query",
  "filters",
  "page",
  "hitsPerPage",
  "offset",
  "restrictSearchableAttributes",
])(
  "a provider option Scout writes, %s, is refused before anything is sent",
  async (key) => {
    const { fake, products } = getScout();

    await expect(
      products
        .search("running")
        .provider(Object.fromEntries([[key, "forged"]]))
        .execute(),
    ).rejects.toMatchObject({
      code: "configuration",
      message: `provider.${key} is written by Scout from the search itself.`,
    });
    expect(fake.calls).toHaveLength(0);
  },
);

test("the profile's fields restrict the attributes Algolia searches", async () => {
  const titles = await search({
    query: "acme",
    searchable: ["title"],
    profile: "titles",
  });

  expect(titles.call?.searchParams).toMatchObject({
    restrictSearchableAttributes: ["title"],
    typoTolerance: false,
  });
  expect(titles.response.hits.map((hit) => hit.native.objectID)).toEqual([
    "1",
    "3",
  ]);
});

// Algolia answers a page past the window with nothing, so the pages end there
// while the total still counts every match.
test("paging ends at the pagination window, whatever the total counts", async () => {
  const { products } = getScout(
    { pagination: { nbHits: 100, nbPages: 50 } },
    { paginationLimitedTo: 4 },
  );

  const search = products.search("").page({ size: 2 });
  const first = await search.execute();
  const last = await search.page({ current: 2 }).execute();

  expect(first.page.next).toBe(2);
  expect(last.total).toMatchObject({ value: 100, scope: "matches" });
  expect(last.page.next).toBeNull();
});

test("a response with nothing but hits answers with nothing invented", async () => {
  const bare: AlgoliaSearchClient = {
    searchSingleIndex: () => Promise.resolve({ hits: [] }),
    searchSingleIndexWithHTTPInfo: () =>
      Promise.resolve({ data: { hits: [] } }),
  };

  const response = await algolia({
    client: bare,
    indexName: "products",
  }).search(getRequest({ facets: ["brand"] }), {
    signal: new AbortController().signal,
  });

  expect(response.total).toEqual({ accuracy: "unknown", scope: "unknown" });
  expect(response.took).toBeNull();
  expect(response.facets).toEqual({});
});

// Algolia names every facet value as a string. The adapter passes it on, and
// the core reads it as the type the index declared.
test("facet values arrive as strings and come out as the declared types", async () => {
  const result = await getScout()
    .products.search("running")
    .facets("price")
    .execute();

  expect(result.facets.price.values).toEqual([
    { value: 79, count: 1 },
    { value: 129, count: 1 },
  ]);
});

test("highlights come back as parts, split on the markers this search sent", async () => {
  const { response, call } = await search({ highlights: ["title"] });

  expect(call?.searchParams.attributesToHighlight).toEqual(["title"]);
  expect(response.hits[0]?.highlights["title"]).toEqual([
    {
      path: ["title"],
      truncated: false,
      parts: [
        { text: "Acme ", matched: false },
        { text: "running", matched: true },
        { text: " shoe", matched: false },
      ],
    },
  ]);
});

test("the markers are made for each search and are never Algolia's default tag", async () => {
  const first = await search({ highlights: ["title"] });
  const second = await search({ highlights: ["title"] });
  const open = first.call?.searchParams.highlightPreTag;

  expect(open).not.toBe("<em>");
  expect(open).not.toBe(second.call?.searchParams.highlightPreTag);
});

test("the document drops Algolia's metadata, which stays on the raw hit and response", async () => {
  const { response } = await search({ highlights: ["title"] });

  expect(response.hits[0]?.document).toEqual({
    objectID: "1",
    title: "Acme running shoe",
    brand: "acme",
    price: 79,
    tags: ["running", "sale"],
  });
  expect(response.hits[0]?.native).toHaveProperty("_highlightResult");
  expect(response.native).toHaveProperty("queryID", "fake-query-id");
  expect(response.took).toBe(3);
});

test("the client's own caches are bypassed unless the application asks for them", async () => {
  const bypassed = await search();
  const cached = await search({}, {}, { cache: true });

  expect(bypassed.call?.method).toBe("searchSingleIndexWithHTTPInfo");
  expect(cached.call?.method).toBe("searchSingleIndex");
});

test("a failing client reaches the caller as a provider error keeping its cause", async () => {
  const cause = new Error("index not found");

  const error = await getRejection(
    getScout({ fail: cause }).products.search("running").execute(),
  );

  expect(error).toMatchObject({ code: "provider", cause });
});
