import { Scout } from "@priemskiyyy/scout";
import type { AdapterSearchRequest } from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import type { TypesenseSearchClient } from "src/types/TypesenseSearchClient";
import type { TypesenseSearchOptions } from "src/types/TypesenseSearchOptions";
import { typesense } from "src/typesense";
import { createTypesenseFake, productIndex } from "src/typesense.fixture";
import type { TypesenseFakeOptions } from "src/typesense.fixture";

const setup = (options: TypesenseFakeOptions = {}) => {
  const fake = createTypesenseFake(options);

  const adapter = typesense({
    client: fake.client,
    collection: "products",
    profiles: { exact: { prefix: false } },
  });

  return { fake, adapter };
};

const getRequest = (
  overrides: Partial<AdapterSearchRequest<TypesenseSearchOptions>> = {},
): AdapterSearchRequest<TypesenseSearchOptions> => ({
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

const search = async (
  overrides: Partial<AdapterSearchRequest<TypesenseSearchOptions>> = {},
  options: TypesenseFakeOptions = {},
) => {
  const { fake, adapter } = setup(options);

  const response = await adapter.search(getRequest(overrides), {
    signal: new AbortController().signal,
  });

  return { response, sent: fake.calls[0] };
};

const getScout = (options: TypesenseFakeOptions = {}) => {
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
  const client: TypesenseSearchClient = {
    collections: () => {
      throw new Error("The client was used.");
    },
  };

  expect(() => typesense({ client, collection: "products" })).not.toThrow();
});

test("a search reaches the collection with the profile's tuning", async () => {
  const { sent } = await search({ searchable: ["name"], profile: "exact" });

  expect(sent).toMatchObject({
    q: "shoe",
    query_by: "name",
    prefix: false,
    page: 1,
    per_page: 10,
  });
});

test("the signal reaches the client", async () => {
  const { fake, adapter } = setup();
  const controller = new AbortController();

  await adapter.search(getRequest(), { signal: controller.signal });

  expect(fake.signals[0]).toBe(controller.signal);
});

test.each([
  ["a page larger than Typesense returns", { page: { current: 1, size: 251 } }],
  [
    "a sort on more fields than Typesense orders by",
    {
      sort: {
        name: "everything",
        by: [
          { field: "a", direction: "asc" },
          { field: "b", direction: "asc" },
          { field: "c", direction: "asc" },
          { field: "d", direction: "asc" },
        ],
      },
    },
  ],
  [
    "a grouped search",
    { provider: Object.fromEntries([["group_by", "brand"]]) },
  ],
] satisfies [string, Partial<AdapterSearchRequest<TypesenseSearchOptions>>][])(
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

test("a grouped answer is refused rather than read as an empty page", async () => {
  const { adapter } = setup({
    respond: (response) => ({
      ...response,
      hits: [],
      grouped_hits: [{ group_key: ["Nimbus"], hits: response.hits }],
    }),
  });

  await expect(
    adapter.search(getRequest(), { signal: new AbortController().signal }),
  ).rejects.toMatchObject({ code: "unsupported-feature" });
});

test.each(["q", "filter_by", "sort_by", "per_page"])(
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

test("the engine's own time, the raw hits and the raw response are kept", async () => {
  const { response } = await search();

  expect(response.took).toBe(3);
  expect(response.hits[0]?.native).toHaveProperty("text_match");
  expect(response.native).toHaveProperty("out_of", 5);
});

test("the fingerprint is the collection", () => {
  expect(setup().adapter.fingerprint()).toBe("products");
});

// Typesense reports every facet value as a string. The adapter passes it on,
// and the core reads it as the type the index declared.
test("facet values come out as the types the index declared", async () => {
  const result = await getScout()
    .products.search("shoe")
    .facets("price", "inStock")
    .execute();

  expect(result.facets.price.values).toContainEqual({ value: 120, count: 1 });
  expect(result.facets.inStock.values).toContainEqual({
    value: true,
    count: 2,
  });
});

test("a failing client reaches the caller as a provider error keeping its cause", async () => {
  const cause = new Error("connection refused");

  const error = await getRejection(
    getScout({ fail: cause }).products.search("shoe").execute(),
  );

  expect(error).toMatchObject({ code: "provider", cause });
});
