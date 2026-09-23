import { Scout } from "@priemskiyyy/scout";
import type { AdapterSearchRequest } from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import { fuse } from "src/fuse";
import { createProductIndex, PRODUCTS, productIndex } from "src/fuse.fixture";
import type { Product } from "src/fuse.fixture";
import type { FuseIndex } from "src/types/FuseIndex";

const context = { signal: new AbortController().signal };

const getRequest = (
  overrides: Partial<AdapterSearchRequest> = {},
): AdapterSearchRequest => ({
  index: "products",
  query: "shoe",
  searchable: ["title", "tags"],
  profile: "default",
  sort: null,
  filter: null,
  facets: [],
  highlights: [],
  page: { current: 1, size: 10 },
  provider: null,
  ...overrides,
});

// Records what the adapter asks of a real Fuse, so a test can see the query.
const getRecordingIndex = (engine: FuseIndex<Product>) => {
  const queries: unknown[] = [];

  const recording: FuseIndex<Product> = {
    options: engine.options,
    getIndex: () => engine.getIndex(),
    search: (query) => {
      queries.push(query);

      return engine.search(query);
    },
  };

  return { recording, queries };
};

const search = async (
  overrides: Partial<AdapterSearchRequest> = {},
  engine: FuseIndex<Product> = createProductIndex(),
) => {
  const { recording, queries } = getRecordingIndex(engine);

  const response = await fuse({ index: recording, revision: () => 1 }).search(
    getRequest(overrides),
    context,
  );

  return {
    response,
    queries,
    ids: response.hits.map((hit) => hit.native.item.id),
  };
};

const getError = async (run: () => unknown) => {
  try {
    await run();
  } catch (error) {
    return error;
  }

  throw new Error("The search answered.");
};

const getScout = () =>
  new Scout({
    indexes: { products: productIndex },
    adapters: {
      products: fuse({ index: createProductIndex(), revision: () => 1 }),
    },
  });

test("creating the adapter asks nothing of the index", () => {
  const index: FuseIndex<Product> = {
    get options(): never {
      throw new Error("The options were read.");
    },
    getIndex: () => {
      throw new Error("The index was read.");
    },
    search: () => {
      throw new Error("The index was searched.");
    },
  };

  expect(() =>
    fuse({
      index,
      revision: () => {
        throw new Error("The revision was read.");
      },
    }),
  ).not.toThrow();
});

test("a search asks Fuse once and counts every match exactly", async () => {
  const { response, queries, ids } = await search();

  expect(queries).toEqual(["shoe"]);
  expect(ids).toEqual(["p1", "p2", "p3", "p4", "p5"]);
  expect(response.total).toEqual({
    value: 5,
    accuracy: "exact",
    scope: "matches",
  });
});

test("an empty query browses every document in collection order", async () => {
  const { response, ids } = await search({ query: "" });

  expect(ids).toEqual(PRODUCTS.map((product) => product.id));
  expect(response.total).toMatchObject({ value: PRODUCTS.length });
});

test("a profile over fewer keys finds only what those keys hold", async () => {
  const everything = await search({ query: "formal" });

  const titles = await search({
    query: "formal",
    searchable: ["title"],
    profile: "titles",
  });

  expect(everything.ids).toEqual(["p3"]);
  expect(titles.ids).toEqual([]);
});

test.each([
  [
    "facets",
    { facets: ["category"] },
    createProductIndex(),
    "unsupported-feature",
  ],
  [
    "highlights on a Fuse built without includeMatches",
    { highlights: ["title"] },
    createProductIndex({ includeMatches: false }),
    "unsupported-feature",
  ],
  [
    "a profile searching a field Fuse does not index",
    { searchable: ["title", "category"], profile: "wide" },
    createProductIndex(),
    "configuration",
  ],
  [
    "fewer keys than Fuse indexes with extended search on",
    { searchable: ["title"], profile: "titles" },
    createProductIndex({ useExtendedSearch: true }),
    "unsupported-feature",
  ],
] satisfies [
  string,
  Partial<AdapterSearchRequest>,
  FuseIndex<Product>,
  string,
][])(
  "%s are refused before anything is searched",
  async (_what, overrides, engine, code) => {
    const { recording, queries } = getRecordingIndex(engine);
    const adapter = fuse({ index: recording, revision: () => 1 });

    const error = await getError(() =>
      adapter.search(getRequest(overrides), context),
    );

    expect(error).toMatchObject({ code });
    expect(queries).toEqual([]);
  },
);

test("filters apply to every match before a page is cut, so the total stays exact", async () => {
  const { response, ids } = await search({
    page: { current: 2, size: 1 },
    filter: {
      type: "and",
      expressions: [
        { type: "comparison", field: "tags", operator: "in", value: ["sale"] },
        {
          type: "not",
          expression: {
            type: "comparison",
            field: "price",
            operator: "gte",
            value: 90,
          },
        },
      ],
    },
  });

  expect(ids).toEqual(["p5"]);
  expect(response.total).toMatchObject({ value: 2 });
  expect(response.native).toHaveLength(5);
});

test("a sort orders every match before a page is cut", async () => {
  const { response, ids } = await search({
    sort: { name: "priceAsc", by: [{ field: "price", direction: "asc" }] },
    page: { current: 1, size: 2 },
  });

  expect(ids).toEqual(["p4", "p5"]);
  expect(response.total).toMatchObject({ value: 5 });
});

test("relevance keeps Fuse's own order", async () => {
  const engine = createProductIndex({ shouldSort: true });
  const { ids } = await search({}, engine);

  expect(ids).toEqual(engine.search("shoe").map((hit) => hit.item.id));
});

test("the native answers are Fuse's own", async () => {
  const engine = createProductIndex();
  const adapter = fuse({ index: engine, revision: () => 1 });
  const response = await adapter.search(getRequest(), context);

  expect(adapter.native).toBe(engine);
  expect(response.native).toEqual(engine.search("shoe"));
  expect(response.hits[0]?.native.score).toEqual(expect.any(Number));
  expect(response.took).toBeNull();
});

test("the fingerprint follows the corpus revision", () => {
  let revision = 1;

  const adapter = fuse({
    index: createProductIndex(),
    revision: () => revision,
  });

  expect(adapter.fingerprint()).toBe("fuse:1");
  revision += 1;
  expect(adapter.fingerprint()).toBe("fuse:2");
});

test("through Scout, a search is filtered, sorted, paged and highlighted", async () => {
  const result = await getScout()
    .index("products")
    .search("shoe")
    .where((product) => product.category.eq("footwear"))
    .sort("priceAsc")
    .highlight("title")
    .page({ size: 2 })
    .execute();

  expect(result.hits.map((hit) => hit.id)).toEqual(["p1", "p2"]);
  expect(result.total).toEqual({
    value: 3,
    accuracy: "exact",
    scope: "matches",
  });
  expect(result.page.next).toBe(2);
  expect(result.hits[0]?.highlights.title[0]?.parts).toContainEqual({
    text: "shoe",
    matched: true,
  });
});

test("through Scout, a refusal reaches the caller unchanged", async () => {
  await expect(
    getScout().index("products").search("shoe").facets("category").execute(),
  ).rejects.toMatchObject({ code: "unsupported-feature" });
});

test("disposing Scout leaves the borrowed Fuse usable", () => {
  const engine = createProductIndex();

  const scout = new Scout({
    indexes: { products: productIndex },
    adapters: { products: fuse({ index: engine, revision: () => 1 }) },
  });

  scout.dispose();

  expect(engine.search("shoe")).toHaveLength(PRODUCTS.length);
});
