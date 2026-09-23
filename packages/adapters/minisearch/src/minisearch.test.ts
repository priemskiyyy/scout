import { Scout } from "@priemskiyyy/scout";
import type { AdapterSearchRequest } from "@priemskiyyy/scout";
import MiniSearch from "minisearch";
import { expect, test } from "vitest";

import { minisearch } from "src/minisearch";
import { createProductIndex, productIndex } from "src/minisearch.fixture";
import type { MiniSearchIndex } from "src/types/MiniSearchIndex";
import type { MiniSearchProfile } from "src/types/MiniSearchProfile";

type Wildcard = typeof MiniSearch.wildcard;

const getRequest = (
  overrides: Partial<AdapterSearchRequest<MiniSearchProfile>> = {},
): AdapterSearchRequest<MiniSearchProfile> => ({
  index: "products",
  query: "shoe",
  searchable: ["title", "category", "tags"],
  profile: "default",
  sort: null,
  filter: null,
  facets: [],
  highlights: [],
  page: { current: 1, size: 10 },
  provider: null,
  ...overrides,
});

/** The real index, with every query it received recorded. */
const setup = () => {
  const products = createProductIndex();
  const queries: (string | Wildcard)[] = [];

  const recording: MiniSearchIndex<Wildcard> = {
    search: (query, options) => {
      queries.push(query);

      return products.search(query, options);
    },
  };

  const adapter = minisearch({
    index: recording,
    wildcard: MiniSearch.wildcard,
    revision: () => "v1",
  });

  return { queries, adapter };
};

const getScout = () => {
  const { queries, adapter } = setup();

  const scout = new Scout({
    indexes: { products: productIndex },
    adapters: { products: adapter },
  });

  return { queries, products: scout.index("products") };
};

const getRejection = async (run: () => unknown) => {
  try {
    await run();
  } catch (error) {
    return error;
  }

  throw new Error("The search answered.");
};

test("creating the adapter asks nothing of the index", () => {
  const untouchable: MiniSearchIndex = {
    search: () => {
      throw new Error("The index was searched.");
    },
  };

  expect(() =>
    minisearch({ index: untouchable, revision: () => 1 }),
  ).not.toThrow();
});

test("the fingerprint follows the corpus revision", () => {
  let revision = 1;

  const adapter = minisearch({
    index: createProductIndex(),
    revision: () => revision,
  });

  const before = adapter.fingerprint();

  revision = 2;

  expect(before).toBe("minisearch:1");
  expect(adapter.fingerprint()).toBe("minisearch:2");
});

test.each([
  ["a facet", { facets: ["category"] }],
  ["a highlight", { highlights: ["title"] }],
])("%s is refused before the index is searched", async (_what, overrides) => {
  const { queries, adapter } = setup();

  const error = await getRejection(() =>
    adapter.search(getRequest(overrides), {
      signal: new AbortController().signal,
    }),
  );

  expect(error).toMatchObject({ code: "unsupported-feature" });
  expect(queries).toEqual([]);
});

test.each(["fields", "filter"])(
  "a provider option Scout writes, %s, is refused before the index is searched",
  async (key) => {
    const { queries, products } = getScout();

    const error = await getRejection(() =>
      products
        .search("shoe")
        .provider(Object.fromEntries([[key, ["title"]]]))
        .execute(),
    );

    expect(error).toMatchObject({
      code: "configuration",
      message: `provider.${key} is written by Scout from the search itself.`,
    });
    expect(queries).toEqual([]);
  },
);

test("it reports no time of its own and keeps the raw answer", async () => {
  const response = await setup().adapter.search(
    getRequest({ page: { current: 1, size: 1 } }),
    { signal: new AbortController().signal },
  );

  expect(response.took).toBeNull();
  expect(response.facets).toEqual({});
  expect(response.hits).toHaveLength(1);
  // The whole answer, before Scout sorted or paged it.
  expect(response.native).toHaveLength(5);
});

test("through a Scout, a refusal reaches the caller as it was thrown", async () => {
  const error = await getRejection(() =>
    getScout().products.search("shoe").facets("category").execute(),
  );

  expect(error).toMatchObject({ code: "unsupported-feature" });
});

test("through a Scout, a filter narrows every match, not the page that came back", async () => {
  const result = await getScout()
    .products.search("shoe")
    .where((product) => product.category.eq("footwear"))
    .page({ size: 1 })
    .execute();

  expect(result.hits).toHaveLength(1);
  expect(result.total).toEqual({
    value: 3,
    accuracy: "exact",
    scope: "matches",
  });
});

test("through a Scout, a sort orders every match before the page is cut", async () => {
  const search = getScout()
    .products.search("")
    .sort("priceAsc")
    .page({ size: 2 });

  const first = await search.execute();
  const second = await search.page({ current: 2 }).execute();

  expect(first.hits.map((hit) => hit.id)).toEqual(["p4", "p6"]);
  expect(second.hits.map((hit) => hit.id)).toEqual(["p5", "p1"]);
  expect(first.page.next).toBe(2);
});
