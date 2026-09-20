import { SearchConfigurationError } from "@priemskiyyy/scout";
import type {
  AdapterSearchRequest,
  FilterExpression,
  SearchAdapter,
} from "@priemskiyyy/scout";
import { expect, test } from "vitest";
import { minisearch } from "src/minisearch";
import type { MiniSearchIndex } from "src/types/MiniSearchIndex";
import type { MiniSearchOptions } from "src/types/MiniSearchOptions";
import type { MiniSearchProfile } from "src/types/MiniSearchProfile";
import type { MiniSearchResult } from "src/types/MiniSearchResult";
import {
  createProductIndex,
  PRODUCTS,
  resolveProduct,
} from "src/minisearch.fixture";

const PROFILES: MiniSearchOptions["profiles"] = {
  default: { fields: ["title", "category", "tags"], prefix: true },
};

const SORTS: MiniSearchOptions["sorts"] = { relevance: "relevance" };

const MATCH_ALL: FilterExpression = { type: "constant", value: true };

const request = (
  overrides: Partial<AdapterSearchRequest<never>> = {},
): AdapterSearchRequest<never> => ({
  index: "products",
  query: "shoe",
  profile: "default",
  sort: "relevance",
  filter: MATCH_ALL,
  facets: [],
  highlights: [],
  page: { current: 1, size: 10 },
  provider: null,
  ...overrides,
});

const createAdapter = () =>
  minisearch({
    index: createProductIndex(),
    revision: () => "v1",
    profiles: PROFILES,
    sorts: SORTS,
  });

// The configured names live in the returned type, so tests hold the adapter
// through the contract rather than through one configuration's names.
type Adapter = SearchAdapter<
  MiniSearchIndex,
  MiniSearchProfile,
  MiniSearchResult,
  readonly MiniSearchResult[] | null
>;

const search = (
  adapter: Adapter,
  overrides: Partial<AdapterSearchRequest<never>> = {},
) =>
  adapter.search(request(overrides), { signal: new AbortController().signal });

const idsOf = (hits: readonly { native: MiniSearchResult }[]): string[] =>
  hits.map((hit) => String(hit.native.id)).sort();

test("it declares only what MiniSearch can actually do", () => {
  const adapter = createAdapter();

  expect(adapter.name).toBe("minisearch");
  expect(adapter.capabilities.filters).toEqual({
    eq: true,
    neq: true,
    in: true,
    notIn: true,
    comparison: true,
    between: true,
    booleanComposition: true,
  });
  expect(adapter.capabilities.pagination).toEqual({
    maxPageSize: null,
  });
  expect(adapter.capabilities.facets).toEqual({
    resultScoped: false,
  });
  expect(adapter.capabilities.highlights).toBe("none");
  expect(adapter.capabilities.cancellation).toBe("logical");
  expect(adapter.reservedOptions).toEqual(["filter"]);
  adapter.dispose();
});

test("stored fields are the document when the instance stores every schema field", async () => {
  const adapter = createAdapter();
  const response = await search(adapter);

  expect(idsOf(response.hits)).toEqual(["p1", "p2", "p3", "p4", "p5"]);
  expect(response.hits[0]?.document).toEqual(
    PRODUCTS.find(
      (product) => product.id === String(response.hits[0]?.native.id),
    ),
  );
  adapter.dispose();
});

test("a resolver builds the document when MiniSearch stored only a subset", async () => {
  const resolved: { id: unknown; stored: Readonly<Record<string, unknown>> }[] =
    [];
  const adapter = minisearch({
    index: createProductIndex({ storeFields: ["title"] }),
    revision: () => "v1",
    profiles: PROFILES,
    sorts: SORTS,
    resolve: (id, stored) => {
      resolved.push({ id, stored });
      return resolveProduct(id);
    },
  });

  const response = await search(adapter, { page: { current: 1, size: 1 } });

  expect(response.hits[0]?.document).toEqual(
    resolveProduct(response.hits[0]?.native.id),
  );
  expect(resolved[0]?.stored).toEqual({
    title: String(response.hits[0]?.native["title"]),
  });
  expect(resolved[0]?.id).toBe(response.hits[0]?.native.id);
  adapter.dispose();
});

test("an instance that stores nothing and has no resolver says so itself", async () => {
  const adapter = minisearch({
    index: createProductIndex({ storeFields: [] }),
    revision: () => "v1",
    profiles: PROFILES,
    sorts: SORTS,
  });

  const failure = search(adapter);

  await expect(failure).rejects.toThrowError(SearchConfigurationError);
  await expect(failure).rejects.toThrowError(/storeFields/);
  await expect(failure).rejects.toThrowError(/resolve/);
  adapter.dispose();
});

test("the fingerprint follows the corpus revision", () => {
  let revision = 1;
  const adapter = minisearch({
    index: createProductIndex(),
    revision: () => revision,
    profiles: PROFILES,
    sorts: SORTS,
  });

  const before = adapter.fingerprint();
  expect(adapter.fingerprint()).toBe(before);

  revision = 2;

  expect(adapter.fingerprint()).not.toBe(before);
  expect(adapter.fingerprint()).toBe("minisearch:2");
  adapter.dispose();
});

test("a page is a one based slice of every match", async () => {
  const adapter = createAdapter();

  const first = await search(adapter, { page: { current: 1, size: 2 } });
  const second = await search(adapter, { page: { current: 2, size: 2 } });
  const third = await search(adapter, { page: { current: 3, size: 2 } });

  expect(first.page).toEqual({
    kind: "page",
    current: 1,
    size: 2,
    next: 2,
    previous: null,
  });
  expect(second.page).toEqual({
    kind: "page",
    current: 2,
    size: 2,
    next: 3,
    previous: 1,
  });
  expect(third.page).toEqual({
    kind: "page",
    current: 3,
    size: 2,
    next: null,
    previous: 2,
  });
  expect(third.hits).toHaveLength(1);
  expect(
    [...idsOf(first.hits), ...idsOf(second.hits), ...idsOf(third.hits)].sort(),
  ).toEqual(["p1", "p2", "p3", "p4", "p5"]);
  adapter.dispose();
});

test("the total counts every match rather than the page, and says so exactly", async () => {
  const adapter = createAdapter();
  const response = await search(adapter, { page: { current: 1, size: 2 } });

  expect(response.hits).toHaveLength(2);
  expect(response.total).toEqual({
    value: 5,
    accuracy: "exact",
    scope: "matches",
  });
  adapter.dispose();
});
