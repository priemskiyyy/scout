import { Scout, ScoutError } from "@priemskiyyy/scout";
import type { AdapterSearchRequest } from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import { http } from "src/http";
import { createSearchBackend, productIndex } from "src/http.fixture";
import type { FixtureBackendOptions } from "src/http.fixture";

const getRequest = (
  overrides: Partial<AdapterSearchRequest<unknown>> = {},
): AdapterSearchRequest<unknown> => ({
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

const getScout = (options: FixtureBackendOptions = {}) => {
  const backend = createSearchBackend(options);

  const scout = new Scout({
    indexes: { products: productIndex },
    adapters: {
      products: http({
        fingerprint: "catalogue-api",
        request: backend.request,
      }),
    },
  });

  return { backend, products: scout.index("products") };
};

const getRejection = async (pending: Promise<unknown>) => {
  try {
    await pending;
  } catch (error) {
    return error;
  }

  throw new Error("The search answered.");
};

test("creating the adapter calls nothing", () => {
  const backend = createSearchBackend();

  http({ fingerprint: "catalogue-api", request: backend.request });

  expect(backend.requests).toEqual([]);
});

test("the fingerprint is the one given, and native is the request itself", () => {
  const { request } = createSearchBackend();
  const adapter = http({ fingerprint: "catalogue-api", request });

  expect(adapter.fingerprint()).toBe("catalogue-api");
  expect(adapter.native).toBe(request);
});

test("each search reaches the request as the portable search with a signal", async () => {
  const backend = createSearchBackend();

  const adapter = http({
    fingerprint: "catalogue-api",
    request: backend.request,
  });

  const request = getRequest();
  const controller = new AbortController();

  await adapter.search(request, { signal: controller.signal });

  expect(backend.requests).toHaveLength(1);
  expect(backend.requests[0]?.search).toBe(request);
  expect(backend.requests[0]?.signal).toBe(controller.signal);
});

test("the backend's answer is read as the wire format", async () => {
  const adapter = http({
    fingerprint: "catalogue-api",
    request: createSearchBackend({ took: 7 }).request,
  });

  const response = await adapter.search(getRequest({ facets: ["brand"] }), {
    signal: new AbortController().signal,
  });

  expect(response.hits.map((hit) => hit.document)).toMatchObject([
    { id: "1" },
    { id: "2" },
    { id: "4" },
  ]);
  expect(response.hits[0]?.native).toHaveProperty("score");
  expect(response.total).toEqual({
    value: 3,
    accuracy: "exact",
    scope: "matches",
  });
  expect(response.facets["brand"]?.values).toEqual([
    { value: "Apex", count: 2 },
    { value: "Nomad", count: 1 },
  ]);
  expect(response.took).toBe(7);
});

test("what the backend leaves out is reported as unknown or empty, never guessed", async () => {
  const adapter = http({
    fingerprint: "catalogue-api",
    request: createSearchBackend({
      answer: { hits: [{ document: { id: "1" } }] },
    }).request,
  });

  const response = await adapter.search(getRequest({ highlights: ["title"] }), {
    signal: new AbortController().signal,
  });

  expect(response.total).toEqual({ accuracy: "unknown", scope: "unknown" });
  expect(response.facets).toEqual({});
  expect(response.took).toBeNull();
  expect(response.hits[0]?.highlights).toEqual({});
});

test("each hit keeps its highlights as given, and the whole hit as native", async () => {
  const hit = {
    document: { id: "1" },
    highlights: {
      title: [
        {
          path: ["title"],
          parts: [{ text: "shoe", matched: true }],
          truncated: false,
        },
      ],
    },
    score: 1.6,
  };

  const adapter = http({
    fingerprint: "catalogue-api",
    request: createSearchBackend({ answer: { hits: [hit] } }).request,
  });

  const response = await adapter.search(getRequest({ highlights: ["title"] }), {
    signal: new AbortController().signal,
  });

  expect(response.hits).toEqual([
    { document: hit.document, highlights: hit.highlights, native: hit },
  ]);
});

// A backend that pages no further than a window says so, and the core ends
// the pages there while the total still counts every match.
test("a backend's paging window reaches the core", async () => {
  const { products } = getScout({
    answer: {
      hits: [{ document: { id: "1" } }, { document: { id: "2" } }],
      total: { value: 100, accuracy: "exact", scope: "matches" },
      retrievable: 2,
    },
  });

  const result = await products.search("shoe").page({ size: 2 }).execute();

  expect(result.total).toMatchObject({ value: 100 });
  expect(result.page.next).toBeNull();
});

test("JSON.stringify of the search is its wire form, and it round trips", async () => {
  const { backend, products } = getScout();

  await products
    .search("shoe")
    .where((product) => product.price.lte(200))
    .sort("cheapest")
    .facets("brand")
    .highlight("title")
    .page({ current: 2, size: 1 })
    .execute();

  const sent = backend.requests[0]?.search;

  expect(JSON.parse(JSON.stringify(sent))).toEqual(sent);
  expect(sent).toMatchObject({
    query: "shoe",
    sort: { name: "cheapest", by: [{ field: "price", direction: "asc" }] },
    page: { current: 2, size: 1 },
  });
});

test("the caller's abort reaches the request, and the search settles", async () => {
  const { backend, products } = getScout({ pending: true });
  const controller = new AbortController();

  const pending = products
    .search("shoe")
    .execute({ signal: controller.signal });

  controller.abort();

  await expect(pending).rejects.toMatchObject({ code: "aborted" });
  expect(backend.requests[0]?.signal.aborted).toBe(true);
});

test("a refusal from the backend reaches the caller as an unsupported feature", async () => {
  const error = await getRejection(
    getScout({ refusal: "Facets on price are not supported." })
      .products.search("shoe")
      .facets("price")
      .execute(),
  );

  expect(error).toMatchObject({
    code: "unsupported-feature",
    message: "Facets on price are not supported.",
  });
});

test("an error the request throws reaches the caller as a provider error keeping its cause", async () => {
  const cause = new Error("The search endpoint answered 502.");

  const error = await getRejection(
    getScout({ fail: cause }).products.search("shoe").execute(),
  );

  expect(error).toMatchObject({ code: "provider", cause });
});

test("a Scout error the request throws reaches the caller unchanged", async () => {
  const refusal = new ScoutError({
    code: "unsupported-feature",
    message: "The catalogue endpoint does not facet.",
  });

  const error = await getRejection(
    getScout({ fail: refusal }).products.search("shoe").execute(),
  );

  expect(error).toBe(refusal);
});

test("provider options reach the backend typed as the application declared", async () => {
  const backend = createSearchBackend();

  const scout = new Scout({
    indexes: { products: productIndex },
    adapters: {
      products: http<{ tenant: string }>({
        fingerprint: "catalogue-api",
        request: backend.request,
      }),
    },
  });

  await scout
    .index("products")
    .search("shoe")
    .provider({ tenant: "eu" })
    .execute();

  expect(backend.requests[0]?.search.provider).toEqual({ tenant: "eu" });
});
