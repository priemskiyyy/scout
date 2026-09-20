import { expect, test, vi } from "vitest";
import { SearchConfigurationError } from "src/errors/SearchConfigurationError";
import { SearchDisposedError } from "src/errors/SearchDisposedError";
import { SearchValidationError } from "src/errors/SearchValidationError";
import { UnsupportedSearchFeatureError } from "src/errors/UnsupportedSearchFeatureError";
import { createMockSearchAdapter } from "src/mock/createMockSearchAdapter";
import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import type { MockSearchAdapterOptions } from "src/mock/types/MockSearchAdapterOptions";
import type { MockSearchResponse } from "src/mock/types/MockSearchResponse";
import { Scout } from "src/utils/Scout";
import { index } from "src/utils/defineIndex";
import { ProductSchema, product } from "src/utils/internal/testSchema.fixture";
import type { Product } from "src/utils/internal/testSchema.fixture";

const answerWith = (
  documents: readonly unknown[],
  extra: Partial<MockSearchResponse> = {},
) => ({
  response: (request: AdapterSearchRequest<unknown>): MockSearchResponse => ({
    hits: documents.map((document) => ({
      document,
      highlights: {},
      native: { score: 1 },
    })),
    page: {
      kind: "page",
      current: request.page.current,
      size: request.page.size,
      next: null,
      previous: null,
    },
    total: { value: documents.length, accuracy: "exact", scope: "matches" },
    facets: {},
    took: null,
    native: { raw: true },
    ...extra,
  }),
});

const NAMES = {
  sorts: { relevance: null, priceAsc: null },
  profiles: { default: null },
} as const;

type BuildOptions = Omit<
  MockSearchAdapterOptions<"relevance" | "priceAsc", "default">,
  "sorts" | "profiles"
>;

// The declared names are spread first so their literal types survive whatever
// a test overrides.
const build = (options: BuildOptions = {}) => {
  const mock = createMockSearchAdapter({ ...NAMES, ...options });
  const sorts: ["relevance" | "priceAsc", ...("relevance" | "priceAsc")[]] = [
    "relevance",
    "priceAsc",
  ];
  const definition = {
    schema: ProductSchema,
    id: (item: Product) => item.id,
    filterable: ["brand", "price", "inStock", "tags"] as const,
    facetable: ["brand"] as const,
    highlightable: ["name"] as const,
    sorts,
    profiles: ["default"] as const,
    adapter: mock.adapter,
  };
  const products = index(definition);
  const scout = new Scout({ indexes: { products } });
  return {
    scout,
    mock,
    definition,
    declaration: products,
    products: scout.index("products"),
  };
};

test("an index keeps the adapter captured at declaration for search and disposal", async () => {
  const original = build();
  const replacement = build();
  const disposeOriginal = vi.spyOn(original.mock.adapter, "dispose");
  const disposeReplacement = vi.spyOn(replacement.mock.adapter, "dispose");
  original.definition.adapter = replacement.mock.adapter;

  const products = original.scout.index("products");
  await products.search("shoe").execute();
  original.scout.dispose();

  expect(products.native).toBe(original.mock.adapter.native);
  expect(original.mock.requests).toHaveLength(1);
  expect(replacement.mock.requests).toHaveLength(0);
  expect(disposeOriginal).toHaveBeenCalledExactlyOnceWith();
  expect(disposeReplacement).not.toHaveBeenCalled();
});

test("an index declaration refuses adapter replacement", () => {
  const original = build();
  const replacement = build();

  expect(() =>
    Object.assign(original.declaration, { adapter: replacement.mock.adapter }),
  ).toThrowError(TypeError);
  expect(original.declaration.adapter).toBe(original.mock.adapter);
});

test("later handles keep the schema and identity captured at declaration", async () => {
  const document = product({ id: "original" });
  const { definition, scout } = build(answerWith([document]));
  definition.schema = {
    "~standard": {
      ...ProductSchema["~standard"],
      validate: () => ({ value: product({ name: "Replacement" }) }),
    },
  };
  definition.id = () => "replacement";

  const result = await scout.index("products").search("shoe").execute();

  expect(result.hits[0]).toMatchObject({ id: "original", document });
});

test("reordering caller-owned sorts cannot change an index's default", async () => {
  const { definition, scout, mock } = build();
  definition.sorts.reverse();

  await scout.index("products").search("shoe").execute();

  expect(mock.requests[0]?.request.sort).toBe("relevance");
});

test("a search reaches the adapter with a normalised request", async () => {
  const { mock, products } = build(answerWith([product()]));

  await products
    .search("shoe")
    .where((p, { and }) => and(p.inStock.eq(true), p.price.lte(200)))
    .sort("priceAsc")
    .execute();

  expect(mock.requests[0]?.request.filter).toEqual({
    type: "and",
    expressions: [
      { type: "comparison", field: "inStock", operator: "eq", value: true },
      { type: "comparison", field: "price", operator: "lte", value: 200 },
    ],
  });
  expect(mock.requests[0]?.request.sort).toBe("priceAsc");
  expect(mock.requests[0]?.request.page.current).toBe(1);
});

test("repeated where calls combine with and", async () => {
  const { mock, products } = build(answerWith([]));

  await products
    .search("shoe")
    .where((p) => p.inStock.eq(true))
    .where((p) => p.brand.eq("Nike"))
    .execute();

  expect(mock.requests[0]?.request.filter).toMatchObject({ type: "and" });
});

test("the builder is immutable, so a stored search is never changed by a later one", async () => {
  const { mock, products } = build(answerWith([]));
  const base = products.search("shoe").pageSize(10);
  const narrowed = base.where((p) => p.brand.eq("Nike"));

  await base.execute();
  await narrowed.execute();

  expect(mock.requests[0]?.request.filter).toEqual({
    type: "constant",
    value: true,
  });
  expect(mock.requests[1]?.request.filter).toMatchObject({
    type: "comparison",
    field: "brand",
  });
});

test("mutating caller-owned provider options cannot change a stored search", async () => {
  const { mock, products } = build();
  const options = { ranking: { fields: ["name"] } };
  const search = products.search("shoe").provider(options);
  const key = search.key();
  options.ranking.fields.push("price");

  expect(search.key()).toEqual(key);
  await search.execute();
  expect(mock.requests[0]?.request.provider).toEqual({
    ranking: { fields: ["name"] },
  });
});

test("mutating a filter operand cannot change a stored search", async () => {
  const { mock, products } = build();
  const brands = ["Nike"];
  const search = products
    .search("shoe")
    .where((fields) => fields.brand.in(brands));
  const key = search.key();
  brands.push("Adidas");

  expect(search.key()).toEqual(key);
  await search.execute();
  expect(mock.requests[0]?.request.filter).toMatchObject({ value: ["Nike"] });
});

test("hits carry the id the index derived, and requested highlights are always present", async () => {
  const { products } = build(answerWith([product({ id: "abc" })]));

  const result = await products.search("shoe").highlight("name").execute();

  expect(result.hits[0]?.id).toBe("abc");
  expect(result.hits[0]?.highlights.name).toEqual([]);
  expect(result.hits[0]?.native).toEqual({ score: 1 });
  expect(result.native).toEqual({ raw: true });
});

test("a requested facet the engine did not return is present and empty", async () => {
  const { products } = build(answerWith([product()]));

  const result = await products.search("shoe").facets("brand").execute();

  expect(result.facets.brand).toEqual({
    field: "brand",
    values: [],
    exhaustive: "unknown",
    native: null,
  });
});

test("a document that fails the schema fails the search by default", async () => {
  const { products } = build(answerWith([{ id: "broken" }]));

  await expect(products.search("shoe").execute()).rejects.toThrowError(
    SearchValidationError,
  );
});

test("skip drops invalid documents and reports how many, because the page changed", async () => {
  const mock = createMockSearchAdapter({
    sorts: { relevance: null },
    profiles: { default: null },
    ...answerWith([product({ id: "ok" }), { id: "broken" }]),
  });
  const products = index({
    schema: ProductSchema,
    id: (item) => item.id,
    filterable: ["brand"],
    facetable: [],
    highlightable: [],
    sorts: ["relevance"],
    profiles: ["default"],
    adapter: mock.adapter,
    validate: "skip",
  });
  const scout = new Scout({ indexes: { products } });

  const result = await scout.index("products").search("shoe").execute();

  expect(result.hits).toHaveLength(1);
  expect(result.skipped).toBe(1);
});

test("an empty query is refused unless the index allows it", async () => {
  const { products } = build(answerWith([]));

  await expect(products.search("").execute()).rejects.toThrowError(
    SearchValidationError,
  );
});

test("a feature the adapter cannot translate is refused before anything is sent", async () => {
  const { mock, products } = build({
    capabilities: {
      filters: {
        ...{
          eq: true,
          neq: true,
          in: true,
          notIn: true,
          comparison: false,
          between: false,
          booleanComposition: true,
        },
      },
    },
    ...answerWith([]),
  });

  await expect(
    products
      .search("shoe")
      .where((p) => p.price.gt(10))
      .execute(),
  ).rejects.toThrowError(UnsupportedSearchFeatureError);
  expect(mock.requests).toHaveLength(0);
});

test("a page larger than the adapter allows is refused with the limit named", async () => {
  const { products } = build({
    capabilities: { pagination: { maxPageSize: 250 } },
    ...answerWith([]),
  });

  await expect(
    products.search("shoe").pageSize(500).execute(),
  ).rejects.toThrowError(/at most 250/);
});

test("a provider option that collides with a Scout owned field is refused", async () => {
  const { products } = build(answerWith([]));

  await expect(
    products.search("shoe").provider({ filter: "brand:=Nike" }).execute(),
  ).rejects.toThrowError(SearchConfigurationError);
});

// Scout pages are one-based, so these are programming mistakes. Left unchecked
// they reach the adapter, and one over a zero-based engine turns page 0 into
// page -1 and asks the provider to explain it.
test("a page or page size that cannot mean anything is refused at the call site", () => {
  const { mock, products } = build(answerWith([]));
  const search = products.search("shoe");

  for (const bad of [0, -1, 1.5, Number.NaN]) {
    expect(() => search.page(bad)).toThrowError(SearchConfigurationError);
    expect(() => search.pageSize(bad)).toThrowError(SearchConfigurationError);
  }
  expect(mock.requests).toHaveLength(0);
});

test("a filter value with no canonical form is refused, not sent", async () => {
  const { mock, products } = build(answerWith([]));

  await expect(
    products
      .search("shoe")
      .where((product) => product.price.gt(Number.NaN))
      .execute(),
  ).rejects.toThrowError(SearchConfigurationError);
  // Two searches filtering on different unrepresentable values would otherwise
  // share a cache key, because neither could be canonicalised.
  expect(mock.requests).toHaveLength(0);
});

// Half of execute throwing and half rejecting is how a caller ends up with an
// uncaught exception from an API that returns a promise.
test("execute never throws synchronously, whatever it refuses", () => {
  const { products } = build(answerWith([]));
  const refusals = [
    () => products.search("").execute(),
    () =>
      products
        .search("a")
        .where((p) => p.price.gt(Number.NaN))
        .execute(),
    () => products.search("a").provider({ filter: "x" }).execute(),
  ];

  for (const refusal of refusals) {
    const returned = refusal();
    expect(returned).toBeInstanceOf(Promise);
    returned.catch(() => undefined);
  }
});

// Every engine answers a reversed range with an empty result and no error, so
// the mistake reads as "nothing matched" and nothing says why.
test("a between with its bounds the wrong way round is refused", async () => {
  const { mock, products } = build(answerWith([]));

  expect(() =>
    products.search("shoe").where((product) => product.price.between(300, 50)),
  ).toThrowError(SearchConfigurationError);
  expect(() =>
    products.search("shoe").where((product) => product.price.between(50, 300)),
  ).not.toThrow();
  expect(mock.requests).toHaveLength(0);
});

test("an unknown index name names the ones that exist, quoted", () => {
  const { scout } = build(answerWith([]));

  // The compiler already refuses this. The runtime guard is what a JavaScript
  // caller, or a name built from a string at runtime, still runs into. The
  // names are quoted because one can be empty or carry spaces, and an unquoted
  // one disappears into the sentence.
  // @ts-expect-error there is no index called nope
  expect(() => scout.index("nope")).toThrowError(
    'There is no index named "nope". The declared indexes are "products".',
  );
});

test("a Scout with no indexes says so rather than trailing off", () => {
  const scout = new Scout({ indexes: {} });

  // @ts-expect-error there is no index at all on this Scout
  expect(() => scout.index("products")).toThrowError(
    'There is no index named "products". This Scout was constructed with no indexes.',
  );
});

test("a disposed Scout refuses new searches", async () => {
  const { scout, products } = build(answerWith([]));
  scout.dispose();

  await expect(products.search("shoe").execute()).rejects.toThrowError(
    SearchDisposedError,
  );
});

test("disposal can be called twice", () => {
  const { scout } = build(answerWith([]));

  scout.dispose();
  expect(() => scout.dispose()).not.toThrow();
});

test("changing the supplied registry cannot reroute an existing Scout", async () => {
  const original = build(answerWith([product({ id: "original" })]));
  const replacement = build(answerWith([product({ id: "replacement" })]));
  const indexes = { products: original.declaration };
  const scout = new Scout({ indexes });

  indexes.products = replacement.declaration;
  const result = await scout.index("products").search("shoe").execute();

  expect(result.hits.map((hit) => hit.id)).toEqual(["original"]);
  expect(replacement.mock.requests).toHaveLength(0);
});

test("disposal releases the original registry even after the caller replaces it", async () => {
  const original = build();
  const replacement = build();
  const indexes = { products: original.declaration };
  const scout = new Scout({ indexes });

  indexes.products = replacement.declaration;
  scout.dispose();

  await expect(original.products.search("shoe").execute()).rejects.toThrowError(
    SearchDisposedError,
  );
  await expect(
    replacement.products.search("shoe").execute(),
  ).resolves.toMatchObject({
    hits: [],
  });
});

test("cleanup continues after a failure and rethrows the original error", () => {
  const first = build();
  const second = build();
  const failure = new Error("first cleanup failed");
  const firstCleanup = vi
    .spyOn(first.mock.adapter, "dispose")
    .mockImplementation(() => {
      throw failure;
    });
  const secondCleanup = vi.spyOn(second.mock.adapter, "dispose");
  const scout = new Scout({
    indexes: { first: first.declaration, second: second.declaration },
  });
  let thrown: unknown;

  try {
    scout.dispose();
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBe(failure);
  expect(firstCleanup).toHaveBeenCalledExactlyOnceWith();
  expect(secondCleanup).toHaveBeenCalledExactlyOnceWith();
  expect(() => scout.dispose()).not.toThrow();
  expect(firstCleanup).toHaveBeenCalledTimes(1);
  expect(secondCleanup).toHaveBeenCalledTimes(1);
});

test("cleanup collects every failure in index order", () => {
  const first = build();
  const second = build();
  const errors = [new Error("first"), new Error("second")];
  vi.spyOn(first.mock.adapter, "dispose").mockImplementation(() => {
    throw errors[0];
  });
  vi.spyOn(second.mock.adapter, "dispose").mockImplementation(() => {
    throw errors[1];
  });
  const scout = new Scout({
    indexes: { first: first.declaration, second: second.declaration },
  });

  expect(() => scout.dispose()).toThrowError(
    expect.objectContaining({ name: "AggregateError", errors }),
  );
});

test("two searches that mean the same thing share a key, and a different one does not", () => {
  const { products } = build(answerWith([]));
  const left = products
    .search("shoe")
    .where((p) => p.brand.in(["Bose", "Sony"]))
    .facets("brand");
  const right = products
    .search("shoe")
    .where((p) => p.brand.in(["Sony", "Bose"]))
    .facets("brand");
  const other = products.search("shoe").where((p) => p.brand.in(["Sony"]));

  expect(left.key()).toEqual(right.key());
  expect(left.key()).not.toEqual(other.key());
});

test("page size is part of the identity", () => {
  const { products } = build(answerWith([]));

  expect(products.search("a").pageSize(10).key()).not.toEqual(
    products.search("a").pageSize(20).key(),
  );
});

test("took reports the provider's own time when it gave one", async () => {
  const { products } = build(answerWith([], { took: 7 }));

  const result = await products.search("shoe").execute();

  expect(result.took).toEqual({ milliseconds: 7, source: "provider" });
});

test("took falls back to Scout's own measurement", async () => {
  const { products } = build(answerWith([]));

  const result = await products.search("shoe").execute();

  expect(result.took.source).toBe("scout");
});

// A wall clock steps backwards when it is corrected, which reported the
// search as having taken a negative number of milliseconds. The measurement
// is monotonic instead.
test("a clock that steps backwards cannot produce a negative duration", async () => {
  const { products } = build(answerWith([]));
  const stopped = Date.now();
  vi.spyOn(Date, "now").mockImplementation(() => stopped - 60_000);

  const result = await products.search("shoe").execute();

  expect(result.took.source).toBe("scout");
  expect(result.took.milliseconds).toBeGreaterThanOrEqual(0);
});
