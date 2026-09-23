import { insert, remove } from "@orama/orama";
import { Scout } from "@priemskiyyy/scout";
import type {
  AdapterSearchRequest,
  AnySearchAdapter,
} from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import { orama } from "src/orama";
import {
  createProductDatabase,
  PRODUCT_PROFILES,
  productIndex,
  searchProducts,
} from "src/orama.fixture";
import type { Product } from "src/orama.fixture";
import type { OramaSearchParams } from "src/types/OramaSearchParams";

const setup = (
  db: ReturnType<typeof createProductDatabase> = createProductDatabase(),
  revision: () => string | number = () => 1,
) => {
  const calls: OramaSearchParams[] = [];

  const adapter = orama({
    db,
    search: (database, params) => {
      calls.push(params);

      return searchProducts(database, params);
    },
    revision,
    profiles: PRODUCT_PROFILES,
  });

  return { adapter, calls, db };
};

const getRequest = (
  overrides: Partial<AdapterSearchRequest> = {},
): AdapterSearchRequest => ({
  index: "products",
  query: "",
  searchable: ["name", "description"],
  profile: "default",
  sort: null,
  filter: null,
  facets: [],
  highlights: [],
  page: { current: 1, size: 10 },
  provider: null,
  ...overrides,
});

const runSearch = async (overrides: Partial<AdapterSearchRequest> = {}) => {
  const { adapter, calls } = setup();

  const response = await adapter.search(getRequest(overrides), {
    signal: new AbortController().signal,
  });

  return { response, sent: calls[0] };
};

const getIds = (response: { hits: readonly { native: { id: string } }[] }) =>
  response.hits.map((hit) => hit.native.id);

const getSortedIds = (response: {
  hits: readonly { native: { id: string } }[];
}) => getIds(response).sort();

const getRejection = async (pending: Promise<unknown>) => {
  try {
    await pending;
  } catch (error) {
    return error;
  }

  throw new Error("The search answered.");
};

const STANDING_DESK: Product = {
  id: "p7",
  name: "Standing Desk",
  description: "Adjustable height frame",
  brand: "Delta Home",
  category: "kitchen",
  price: 420,
  inStock: true,
};

test("creating the adapter asks nothing of the engine", () => {
  const db = {
    get schema(): Readonly<Record<string, unknown>> {
      throw new Error("The database was read.");
    },
  };

  expect(() =>
    orama({
      db,
      search: () => {
        throw new Error("The engine was searched.");
      },
      revision: () => {
        throw new Error("The revision was read.");
      },
    }),
  ).not.toThrow();
});

test("the fingerprint carries the corpus revision", () => {
  expect(setup(createProductDatabase(), () => "v7").adapter.fingerprint()).toBe(
    "orama:v7",
  );
});

test("bumping the revision after changing the corpus changes the query key", async () => {
  const db = createProductDatabase();
  let revision = 1;

  const scout = new Scout({
    indexes: { products: productIndex },
    adapters: { products: setup(db, () => revision).adapter },
  });

  const products = scout.index("products");
  const before = products.search("").key();
  const first = await products.search("").execute();

  insert(db, STANDING_DESK);
  revision += 1;

  const second = await products.search("").execute();

  expect(products.search("").key()).not.toEqual(before);
  expect(first.total).toEqual({
    value: 6,
    accuracy: "exact",
    scope: "matches",
  });
  expect(second.total).toEqual({
    value: 7,
    accuracy: "exact",
    scope: "matches",
  });
});

// The corpus answers differently while the key says nothing changed, which is
// the staleness the revision exists to prevent.
test("changing the corpus without bumping the revision leaves the key alone", async () => {
  const db = createProductDatabase();

  const scout = new Scout({
    indexes: { products: productIndex },
    adapters: { products: setup(db, () => 1).adapter },
  });

  const products = scout.index("products");
  const before = products.search("").key();

  insert(db, STANDING_DESK);

  const result = await products.search("").execute();

  expect(products.search("").key()).toEqual(before);
  expect(result.total).toEqual({
    value: 7,
    accuracy: "exact",
    scope: "matches",
  });
});

test("a page becomes Orama's limit and offset", async () => {
  const { response, sent } = await runSearch({
    page: { current: 2, size: 2 },
    sort: { name: "priceAsc", by: [{ field: "price", direction: "asc" }] },
  });

  expect(sent).toMatchObject({ limit: 2, offset: 2 });
  expect(getIds(response)).toEqual(["p4", "p2"]);
});

test("relevance leaves the order to Orama", async () => {
  const { response, sent } = await runSearch({ query: "headphones" });

  expect(sent).not.toHaveProperty("sortBy");
  expect(getSortedIds(response)).toEqual(["p1", "p2"]);
});

test.each([
  [
    "a sort by more than one property",
    {
      sort: {
        name: "cheapestNamed",
        by: [
          { field: "price", direction: "asc" },
          { field: "name", direction: "asc" },
        ],
      },
    },
    "unsupported-feature",
  ],
  [
    "a sort on a property Orama keeps no sort index for",
    { sort: { name: "byBrand", by: [{ field: "brand", direction: "asc" }] } },
    "unsupported-feature",
  ],
  [
    "a filter on a string property",
    {
      filter: {
        type: "comparison",
        field: "name",
        operator: "eq",
        value: "Wireless Headphones",
      },
    },
    "unsupported-feature",
  ],
  [
    "a filter on a property the schema never declared",
    {
      filter: {
        type: "comparison",
        field: "colour",
        operator: "eq",
        value: "black",
      },
    },
    "configuration",
  ],
  [
    "a facet on a number property",
    { facets: ["price"] },
    "unsupported-feature",
  ],
  [
    "a facet on a property the schema never declared",
    { facets: ["colour"] },
    "configuration",
  ],
  [
    "a highlight",
    { query: "headphones", highlights: ["name"] },
    "unsupported-feature",
  ],
] satisfies [string, Partial<AdapterSearchRequest>, string][])(
  "%s is refused before anything is searched",
  async (_what, overrides, code) => {
    const { adapter, calls } = setup();

    await expect(
      adapter.search(getRequest(overrides), {
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ code });
    expect(calls).toHaveLength(0);
  },
);

test("a highlight is refused with the reason", async () => {
  const { adapter } = setup();

  await expect(
    adapter.search(getRequest({ query: "headphones", highlights: ["name"] }), {
      signal: new AbortController().signal,
    }),
  ).rejects.toMatchObject({
    message: "Orama reports no match offsets, so it cannot highlight.",
  });
});

// The adapter's own type takes none, so this is what a JavaScript caller meets.
test("a provider option is refused before anything is searched", async () => {
  const { adapter, calls } = setup();
  const untyped: AnySearchAdapter = adapter;

  await expect(
    untyped.search(
      { ...getRequest(), provider: { tolerance: 2 } },
      { signal: new AbortController().signal },
    ),
  ).rejects.toMatchObject({ code: "configuration" });
  expect(calls).toHaveLength(0);
});

// Orama 3.1 negates over every internal id it ever issued, so a document it
// removed comes back as an empty hit when nothing is searched for. Scout's
// schema check then refuses it. This pins the quirk the README states.
test("a negated browse after a removal still meets Orama's removed document", async () => {
  const { adapter, db } = setup();

  remove(db, "p6");

  const response = await adapter.search(
    getRequest({
      filter: {
        type: "comparison",
        field: "brand",
        operator: "neq",
        value: "Acme Audio",
      },
    }),
    { signal: new AbortController().signal },
  );

  expect(getSortedIds(response)).toEqual(["p3", "p4", "p5", "p6"]);
  expect(response.hits.find((hit) => hit.native.id === "p6")?.document).toEqual(
    {},
  );
});

test("an empty query browses every document, even one with nothing to search", async () => {
  const { adapter, calls, db } = setup();

  insert(db, { ...STANDING_DESK, name: "", description: "" });

  const response = await adapter.search(getRequest(), {
    signal: new AbortController().signal,
  });

  // Orama matches an empty term against the properties it is given, which
  // would leave out the document above, so neither is sent.
  expect(calls[0]).not.toHaveProperty("term");
  expect(calls[0]).not.toHaveProperty("properties");
  expect(response.total).toEqual({
    value: 7,
    accuracy: "exact",
    scope: "matches",
  });
});

test("the profile's fields become the properties Orama reads", async () => {
  const wide = await runSearch({ query: "cancelling" });

  const narrow = await runSearch({ query: "cancelling", searchable: ["name"] });

  expect(wide.sent).toMatchObject({
    term: "cancelling",
    properties: ["name", "description"],
  });
  expect(getIds(wide.response)).toEqual(["p1"]);
  expect(narrow.response.hits).toHaveLength(0);
});

test("a profile's tuning is applied, so it can forgive a misspelled term", async () => {
  const strict = await runSearch({ query: "headphnes" });

  const forgiving = await runSearch({
    query: "headphnes",
    profile: "forgiving",
  });

  expect(forgiving.sent?.tolerance).toBe(2);
  expect(strict.response.hits).toHaveLength(0);
  expect(getSortedIds(forgiving.response)).toEqual(["p1", "p2"]);
});

test("a multi-byte term matches the document that carries it", async () => {
  expect(getIds((await runSearch({ query: "Café" })).response)).toEqual(["p5"]);
});

// Orama keys a bucket by the value's string. The core reads it as the type
// the index declared.
test("a boolean facet comes out of a Scout as booleans", async () => {
  const scout = new Scout({
    indexes: { products: productIndex },
    adapters: { products: setup().adapter },
  });

  const result = await scout
    .index("products")
    .search("")
    .facets("inStock")
    .execute();

  expect(result.facets.inStock.values).toEqual([
    { value: true, count: 4 },
    { value: false, count: 2 },
  ]);
});

test("every hit keeps Orama's own result, including its score", async () => {
  const { response } = await runSearch({ query: "headphones" });
  const first = response.hits[0];

  expect(first?.native.score).toBeGreaterThan(0);
  expect(first?.native.document).toBe(first?.document);
  expect(first?.highlights).toEqual({});
  expect(response.native.count).toBe(2);
});

test("the reported time is Orama's own measurement, in milliseconds", async () => {
  const { response } = await runSearch();

  expect(response.took).toBe(response.native.elapsed.raw / 1_000_000);
});

test("a failing engine reaches the caller as a provider error keeping its cause", async () => {
  const cause = new Error("The index is corrupt.");

  const scout = new Scout({
    indexes: { products: productIndex },
    adapters: {
      products: orama({
        db: createProductDatabase(),
        search: () => {
          throw cause;
        },
        revision: () => 1,
      }),
    },
  });

  const error = await getRejection(
    scout.index("products").search("").execute(),
  );

  expect(error).toMatchObject({ code: "provider", cause });
});
