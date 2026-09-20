import { SearchConfigurationError } from "@priemskiyyy/scout";
import type {
  AdapterSearchRequest,
  FilterExpression,
  FilterOperator,
  SearchAdapter,
} from "@priemskiyyy/scout";
import { expect, test } from "vitest";
import { minisearch } from "src/minisearch";
import type { MiniSearchIndex } from "src/types/MiniSearchIndex";
import type { MiniSearchOptions } from "src/types/MiniSearchOptions";
import type { MiniSearchProfile } from "src/types/MiniSearchProfile";
import type { MiniSearchResult } from "src/types/MiniSearchResult";
import type { MiniSearchSearchOptions } from "src/types/MiniSearchSearchOptions";
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

const comparison = (
  field: string,
  operator: FilterOperator,
  value: unknown,
): FilterExpression => ({ type: "comparison", field, operator, value });

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

/** Wraps an instance so a test can assert what reached the engine. */
const recordingIndex = (index: MiniSearchIndex) => {
  const calls: {
    query: string;
    options: MiniSearchSearchOptions | undefined;
  }[] = [];
  return {
    calls,
    index: {
      search: (query: string, options?: MiniSearchSearchOptions) => {
        calls.push({ query, options });
        return index.search(query, options);
      },
    },
  };
};

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

test("a filter narrows every match, not the page that came back", async () => {
  const adapter = createAdapter();
  const filter = comparison("category", "eq", "footwear");

  const first = await search(adapter, {
    filter,
    page: { current: 1, size: 2 },
  });
  const second = await search(adapter, {
    filter,
    page: { current: 2, size: 2 },
  });

  // Three footwear products match. A predicate applied to one returned page
  // would have left the total at five and page two empty.
  expect(first.total).toEqual({
    value: 3,
    accuracy: "exact",
    scope: "matches",
  });
  expect(second.hits).toHaveLength(1);
  expect([...idsOf(first.hits), ...idsOf(second.hits)].sort()).toEqual([
    "p1",
    "p2",
    "p3",
  ]);
  adapter.dispose();
});

test("every portable operator is translated into the predicate", async () => {
  const adapter = createAdapter();
  const matching = async (filter: FilterExpression) =>
    idsOf((await search(adapter, { filter })).hits);

  expect(await matching(comparison("category", "neq", "footwear"))).toEqual([
    "p4",
    "p5",
  ]);
  expect(
    await matching(comparison("category", "in", ["care", "storage"])),
  ).toEqual(["p4", "p5"]);
  expect(
    await matching(comparison("category", "not-in", ["footwear"])),
  ).toEqual(["p4", "p5"]);
  expect(await matching(comparison("price", "gt", 100))).toEqual(["p2", "p3"]);
  expect(await matching(comparison("price", "gte", 140))).toEqual(["p2", "p3"]);
  expect(await matching(comparison("price", "lt", 45))).toEqual(["p4"]);
  expect(await matching(comparison("price", "lte", 45))).toEqual(["p4", "p5"]);
  expect(await matching(comparison("price", "between", [10, 100]))).toEqual([
    "p1",
    "p5",
  ]);
  // A repeated field answers when any element answers.
  expect(await matching(comparison("tags", "eq", "sale"))).toEqual([
    "p1",
    "p4",
    "p5",
  ]);
  adapter.dispose();
});

test("filters compose with and, or and not", async () => {
  const adapter = createAdapter();
  const matching = async (filter: FilterExpression) =>
    idsOf((await search(adapter, { filter })).hits);

  expect(
    await matching({
      type: "and",
      expressions: [
        comparison("category", "eq", "footwear"),
        comparison("price", "lt", 150),
      ],
    }),
  ).toEqual(["p1", "p2"]);
  expect(
    await matching({
      type: "or",
      expressions: [
        comparison("category", "eq", "care"),
        comparison("category", "eq", "storage"),
      ],
    }),
  ).toEqual(["p4", "p5"]);
  expect(
    await matching({
      type: "not",
      expression: comparison("tags", "eq", "sale"),
    }),
  ).toEqual(["p2", "p3"]);
  adapter.dispose();
});

test("a contradiction answers without asking the engine", async () => {
  const recording = recordingIndex(createProductIndex());
  const adapter = minisearch({
    index: recording.index,
    revision: () => "v1",
    profiles: PROFILES,
    sorts: SORTS,
  });

  const response = await search(adapter, {
    filter: { type: "constant", value: false },
  });

  expect(recording.calls).toEqual([]);
  expect(response.hits).toEqual([]);
  expect(response.total).toEqual({
    value: 0,
    accuracy: "exact",
    scope: "matches",
  });
  // MiniSearch was never asked, so there is no result array of its own to hand
  // back. An empty one would read as an answer it gave.
  expect(response.native).toBeNull();
  adapter.dispose();
});
