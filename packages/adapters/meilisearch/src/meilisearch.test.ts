import { Scout } from "@priemskiyyy/scout";
import type { AdapterSearchRequest } from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import { meilisearch } from "src/meilisearch";
import { createMeilisearchFake, productIndex } from "src/meilisearch.fixture";
import type { MeilisearchFakeOptions } from "src/meilisearch.fixture";
import type { MeilisearchAdapterOptions } from "src/types/MeilisearchAdapterOptions";
import type { MeilisearchIndexClient } from "src/types/MeilisearchIndexClient";
import type { MeilisearchSearchOptions } from "src/types/MeilisearchSearchOptions";

type SetupOptions = {
  fake?: MeilisearchFakeOptions;
  adapter?: Omit<MeilisearchAdapterOptions, "index">;
};

const setup = ({
  fake: fakeOptions = {},
  adapter: options = {},
}: SetupOptions = {}) => {
  const fake = createMeilisearchFake(fakeOptions);

  const adapter = meilisearch({
    profiles: { titles: { matchingStrategy: "all" } },
    ...options,
    index: fake.index,
  });

  return { fake, adapter };
};

const getRequest = (
  overrides: Partial<AdapterSearchRequest<MeilisearchSearchOptions>> = {},
): AdapterSearchRequest<MeilisearchSearchOptions> => ({
  index: "products",
  query: "shoe",
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
  overrides: Partial<AdapterSearchRequest<MeilisearchSearchOptions>> = {},
  options: SetupOptions = {},
) => {
  const { fake, adapter } = setup(options);

  const response = await adapter.search(getRequest(overrides), {
    signal: new AbortController().signal,
  });

  return { response, sent: fake.calls[0] };
};

const getScout = (options: SetupOptions = {}) => {
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

test("creating the adapter asks nothing of the client", () => {
  const index: MeilisearchIndexClient = {
    get uid(): string {
      throw new Error("The client was read.");
    },
    search: () => {
      throw new Error("The client was used.");
    },
  };

  expect(() => meilisearch({ index })).not.toThrow();
});

test("the profile's fields are what the query runs against", async () => {
  const { response, sent } = await search({
    searchable: ["title"],
    query: "Apex",
  });

  expect(sent?.params?.attributesToSearchOn).toEqual(["title"]);
  expect(response.hits).toEqual([]);
});

test("a profile's tuning reaches the engine", async () => {
  const plain = await search();
  const titles = await search({ profile: "titles", searchable: ["title"] });

  expect(plain.sent?.params).not.toHaveProperty("matchingStrategy");
  expect(titles.sent?.params).toMatchObject({
    attributesToSearchOn: ["title"],
    matchingStrategy: "all",
  });
});

test("a page larger than maxTotalHits lets it fill is refused before anything is sent", async () => {
  const { fake, adapter } = setup({ adapter: { maxTotalHits: 10 } });

  await expect(
    adapter.search(getRequest({ page: { current: 1, size: 11 } }), {
      signal: new AbortController().signal,
    }),
  ).rejects.toMatchObject({
    code: "unsupported-feature",
    message:
      "Meilisearch fills at most 10 hits a page, the index's pagination.maxTotalHits.",
  });
  expect(fake.calls).toHaveLength(0);
});

test.each([
  "q",
  "attributesToSearchOn",
  "filter",
  "sort",
  "page",
  "limit",
  "highlightPreTag",
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

test("the markers change between searches, so no document can hold one", async () => {
  const { fake, adapter } = setup();
  const signal = new AbortController().signal;

  await adapter.search(getRequest({ highlights: ["title"] }), { signal });
  await adapter.search(getRequest({ highlights: ["title"] }), { signal });

  expect(fake.calls[0]?.params?.highlightPreTag).toMatch(/^\[scout:.+\]$/);
  expect(fake.calls[0]?.params?.highlightPreTag).not.toBe(
    fake.calls[1]?.params?.highlightPreTag,
  );
});

test("the query travels in the first argument, and an empty one browses", async () => {
  const shoe = await search({ query: "shoe" });
  const browse = await search({ query: "" });

  expect(shoe.sent?.query).toBe("shoe");
  expect(shoe.sent?.params).not.toHaveProperty("q");
  expect(browse.sent?.query).toBe("");
  expect(browse.response.hits).toHaveLength(6);
});

// Meilisearch never says whether it cropped a value, so a cropping search
// cannot claim a fragment is whole.
test("a cropping search does not claim its fragments are whole", async () => {
  const { response } = await search({
    highlights: ["title"],
    provider: { attributesToCrop: ["title"] },
  });

  expect(response.hits[0]?.highlights["title"]?.[0]?.truncated).toBe("unknown");
});

test("the engine's own time, the raw hit and the raw response are kept", async () => {
  const { response } = await search(
    { query: "sock", highlights: ["title"] },
    { fake: { processingTimeMs: 42 } },
  );

  expect(response.took).toBe(42);
  expect(response.hits[0]?.native).toHaveProperty("_formatted");
  expect(response.native).toHaveProperty("processingTimeMs", 42);
});

test("the fingerprint is the index uid", () => {
  expect(setup({ fake: { uid: "catalogue" } }).adapter.fingerprint()).toBe(
    "catalogue",
  );
});

test("the signal reaches the client", async () => {
  const { fake, adapter } = setup();
  const controller = new AbortController();

  await adapter.search(getRequest(), { signal: controller.signal });

  expect(fake.calls[0]?.signal).toBe(controller.signal);
});

// Meilisearch reports every facet value as a string. The adapter passes it
// on, and the core reads it as the type the index declared.
test("facet values arrive as strings and come out as the declared types", async () => {
  const result = await getScout()
    .products.search("shoe")
    .facets("price", "inStock")
    .execute();

  expect(result.facets.price.values).toContainEqual({ value: 120, count: 1 });
  expect(result.facets.inStock.values).toEqual([
    { value: true, count: 3 },
    { value: false, count: 2 },
  ]);
});

test("a failing client reaches the caller as a provider error keeping its cause", async () => {
  const cause = new Error("connection refused");

  const index: MeilisearchIndexClient = {
    uid: "products",
    search: () => Promise.reject(cause),
  };

  const scout = new Scout({
    indexes: { products: productIndex },
    adapters: { products: meilisearch({ index }) },
  });

  const error = await getRejection(
    scout.index("products").search("shoe").execute(),
  );

  expect(error).toMatchObject({ code: "provider", cause });
});
