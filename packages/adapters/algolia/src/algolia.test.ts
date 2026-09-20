import { SearchConfigurationError } from "@priemskiyyy/scout";
import type { AdapterSearchRequest } from "@priemskiyyy/scout";
import { expect, test } from "vitest";
import { algolia } from "src/algolia";
import type { AlgoliaSearchClient } from "src/types/AlgoliaSearchClient";
import type { AlgoliaSearchParams } from "src/types/AlgoliaSearchParams";
import { createAlgoliaFake } from "src/algolia.fixture";

const SORTS = {
  relevance: { index: { name: "products" } },
  priceAsc: { index: { name: "products_price_asc" } },
};

const PROFILES = {
  default: {},
  strict: { searchParams: { typoTolerance: false } },
};

test("numeric and boolean facets retain their declared value types", async () => {
  const fake = createAlgoliaFake({
    documents: [
      {
        objectID: "1",
        title: "shoe",
        brand: "acme",
        price: 79,
        tags: [],
        inStock: true,
      },
    ],
  });
  const adapter = algolia({
    client: fake.client,
    index: { name: "products" },
    sorts: SORTS,
    profiles: PROFILES,
    facets: { price: "number", inStock: "boolean" },
  });
  const result = await adapter.search(
    request({ query: "shoe", facets: ["price", "inStock"] }),
    { signal: new AbortController().signal },
  );
  expect(result.facets.price?.values).toEqual([{ value: 79, count: 1 }]);
  expect(result.facets.inStock?.values).toEqual([{ value: true, count: 1 }]);
});

test.each([
  "filters",
  "numericFilters",
  "facetFilters",
  "tagFilters",
  "offset",
  "length",
])("profiles cannot override Scout's %s", (key) => {
  const fake = createAlgoliaFake();
  expect(() =>
    algolia({
      client: fake.client,
      index: { name: "products" },
      sorts: SORTS,
      profiles: { default: { searchParams: { [key]: "hidden constraint" } } },
    }),
  ).toThrow(SearchConfigurationError);
  expect(fake.calls).toEqual([]);
});

type AdapterOverrides = {
  cache?: boolean;
  paginationLimitedTo?: number;
};

const adapterFor = (
  client: AlgoliaSearchClient,
  overrides: AdapterOverrides = {},
) =>
  algolia({
    client,
    index: { name: "products" },
    sorts: SORTS,
    profiles: PROFILES,
    ...(typeof overrides.cache === "boolean" ? { cache: overrides.cache } : {}),
    ...(typeof overrides.paginationLimitedTo === "number"
      ? { paginationLimitedTo: overrides.paginationLimitedTo }
      : {}),
  });

const request = (
  overrides: Partial<AdapterSearchRequest<AlgoliaSearchParams>> = {},
): AdapterSearchRequest<AlgoliaSearchParams> => ({
  index: "products",
  query: "running",
  profile: "default",
  sort: "relevance",
  filter: { type: "constant", value: true },
  facets: [],
  highlights: [],
  page: { current: 1, size: 10 },
  provider: null,
  ...overrides,
});

const searchWith = (
  fake: ReturnType<typeof createAlgoliaFake>,
  overrides: Partial<AdapterSearchRequest<AlgoliaSearchParams>> = {},
  adapterOverrides: AdapterOverrides = {},
) =>
  adapterFor(fake.client, adapterOverrides).search(request(overrides), {
    signal: new AbortController().signal,
  });

const paramsOf = (fake: ReturnType<typeof createAlgoliaFake>) =>
  fake.calls[0]?.searchParams;

const failed = (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );

test("it declares what it can actually do, including that it cannot cancel", () => {
  const adapter = adapterFor(createAlgoliaFake().client);

  expect(adapter.name).toBe("algolia");
  expect(adapter.capabilities.pagination.maxPageSize).toBe(1000);
  expect(adapter.capabilities.cancellation).toBe("logical");
  expect(adapter.capabilities.highlights).toBe("parts");
});

test("it reserves every parameter that would overwrite a scout owned field", () => {
  const adapter = adapterFor(createAlgoliaFake().client);

  expect(adapter.reservedOptions).toEqual([
    "filters",
    "query",
    "page",
    "hitsPerPage",
    "facets",
    "attributesToHighlight",
    "highlightPreTag",
    "highlightPostTag",
    "numericFilters",
    "facetFilters",
    "tagFilters",
    "offset",
    "length",
  ]);
});

test("its fingerprint names the primary index and every replica it may read", () => {
  const adapter = adapterFor(createAlgoliaFake().client);

  expect(adapter.fingerprint()).toBe(
    "products relevance=products priceAsc=products_price_asc",
  );
});

test("a named sort reads its replica index rather than a sort parameter", async () => {
  const fake = createAlgoliaFake();

  await searchWith(fake, { sort: "priceAsc" });

  expect(fake.calls[0]?.indexName).toBe("products_price_asc");
  expect(paramsOf(fake)).not.toHaveProperty("sort");
});

test("a sort the adapter was not configured for is a configuration error", async () => {
  const fake = createAlgoliaFake();

  const error = await failed(searchWith(fake, { sort: "newest" }));

  expect(error).toBeInstanceOf(SearchConfigurationError);
  expect(error).toHaveProperty("path", "sorts.newest");
  expect(fake.calls).toHaveLength(0);
});

test("a profile the adapter was not configured for is a configuration error", async () => {
  const fake = createAlgoliaFake();

  const error = await failed(searchWith(fake, { profile: "boosted" }));

  expect(error).toBeInstanceOf(SearchConfigurationError);
  expect(error).toHaveProperty("path", "profiles.boosted");
});
