import type {
  AdapterSearchRequest,
  AnySearchAdapter,
} from "@priemskiyyy/scout";
import { expect, test } from "vitest";
import { http } from "src/http";
import type { HttpCapabilities } from "src/types/HttpCapabilities";
import { createSearchBackend } from "src/http.fixture";
import type { FixtureBackend } from "src/http.fixture";
import { scoutWireRequest } from "src/scoutWireRequest";
import { scoutWireResponse } from "src/scoutWireResponse";

const ENDPOINT = "https://api.test/search";

const CAPABILITIES: HttpCapabilities = {
  filters: {
    eq: true,
    neq: true,
    in: true,
    notIn: true,
    comparison: true,
    between: true,
    booleanComposition: true,
  },
  pagination: { maxPageSize: 100 },
  facets: { resultScoped: true },
  highlights: "parts",
};

const request = (
  overrides: Partial<AdapterSearchRequest<never>> = {},
): AdapterSearchRequest<never> => ({
  index: "products",
  query: "shoe",
  profile: "default",
  sort: "relevance",
  filter: { type: "constant", value: true },
  facets: [],
  highlights: [],
  page: { current: 1, size: 10 },
  provider: null,
  ...overrides,
});

const wireAdapter = (backend: FixtureBackend) =>
  http({
    endpoint: ENDPOINT,
    fetch: backend.fetch,
    capabilities: CAPABILITIES,
    sorts: { relevance: null },
    profiles: { default: null },
    toRequest: scoutWireRequest,
    fromResponse: scoutWireResponse,
  });

const run = (
  adapter: AnySearchAdapter,
  overrides: Partial<AdapterSearchRequest<never>> = {},
  signal: AbortSignal = new AbortController().signal,
) => adapter.search(request(overrides), { signal });

test("a POST carries the request as a JSON body and maps what came back", async () => {
  const backend = createSearchBackend({ took: 12 });

  const response = await run(wireAdapter(backend), {
    facets: ["brand"],
    page: { current: 1, size: 2 },
  });

  const [call] = backend.calls;
  expect(call?.url).toBe(ENDPOINT);
  expect(call?.init.method).toBe("POST");
  expect(call?.init.headers["content-type"]).toBe("application/json");
  expect(JSON.parse(call?.init.body ?? "null")).toEqual({
    index: "products",
    query: "shoe",
    profile: "default",
    sort: "relevance",
    filter: { type: "constant", value: true },
    facets: ["brand"],
    highlights: [],
    page: { current: 1, size: 2 },
    provider: null,
  });
  expect(response.hits.map((hit) => hit.document)).toEqual([
    expect.objectContaining({ id: "1" }),
    expect.objectContaining({ id: "2" }),
  ]);
  expect(response.total).toEqual({
    value: 3,
    accuracy: "exact",
    scope: "matches",
  });
  expect(response.page).toEqual({
    kind: "page",
    current: 1,
    size: 2,
    next: 2,
    previous: null,
  });
  expect(response.facets.brand?.values).toEqual([
    { value: "Apex", count: 2 },
    { value: "Nomad", count: 1 },
  ]);
  expect(response.took).toBe(12);
});

test("a GET carries the request in the query string and sends no body", async () => {
  const backend = createSearchBackend();
  const adapter = http({
    endpoint: "https://api.test/search?v=2",
    fetch: backend.fetch,
    method: "GET",
    capabilities: CAPABILITIES,
    sorts: { relevance: null },
    profiles: { default: null },
    toRequest: scoutWireRequest,
    fromResponse: scoutWireResponse,
  });

  const response = await run(adapter, {
    filter: {
      type: "comparison",
      field: "brand",
      operator: "eq",
      value: "Nomad",
    },
  });

  const [call] = backend.calls;
  expect(call?.init.body).toBeUndefined();
  const sent = new URL(call?.url ?? "").searchParams;
  // The endpoint keeps the query it already had, a string travels as itself,
  // and everything else as JSON.
  expect(sent.get("v")).toBe("2");
  expect(sent.get("query")).toBe("shoe");
  expect(JSON.parse(sent.get("page") ?? "null")).toEqual({
    current: 1,
    size: 10,
  });
  expect(JSON.parse(sent.get("filter") ?? "null")).toEqual({
    type: "comparison",
    field: "brand",
    operator: "eq",
    value: "Nomad",
  });
  // The fake really read that query string back, so the encoding round-trips.
  expect(response.hits.map((hit) => hit.document)).toEqual([
    expect.objectContaining({ id: "4" }),
  ]);
});

test("a header function is called once per search, so a refreshed token travels", async () => {
  const backend = createSearchBackend();
  let token = "first";
  const adapter = http({
    endpoint: ENDPOINT,
    fetch: backend.fetch,
    headers: () => ({ authorization: `Bearer ${token}` }),
    capabilities: CAPABILITIES,
    sorts: { relevance: null },
    profiles: { default: null },
    toRequest: scoutWireRequest,
    fromResponse: scoutWireResponse,
  });

  await run(adapter);
  token = "second";
  await run(adapter);

  expect(backend.calls.map((call) => call.init.headers.authorization)).toEqual([
    "Bearer first",
    "Bearer second",
  ]);
});

test("an async header function is awaited before the request is sent", async () => {
  const backend = createSearchBackend();
  const adapter = http({
    endpoint: ENDPOINT,
    fetch: backend.fetch,
    headers: async () => ({ "x-api-key": await Promise.resolve("from-store") }),
    capabilities: CAPABILITIES,
    sorts: { relevance: null },
    profiles: { default: null },
    toRequest: scoutWireRequest,
    fromResponse: scoutWireResponse,
  });

  await run(adapter);

  expect(backend.calls[0]?.init.headers).toEqual({
    "content-type": "application/json",
    "x-api-key": "from-store",
  });
});

test("a static header record travels and may replace the content type", async () => {
  const backend = createSearchBackend();
  const adapter = http({
    endpoint: ENDPOINT,
    fetch: backend.fetch,
    headers: {
      "content-type": "application/vnd.search+json",
      "x-tenant": "eu",
    },
    capabilities: CAPABILITIES,
    sorts: { relevance: null },
    profiles: { default: null },
    toRequest: scoutWireRequest,
    fromResponse: scoutWireResponse,
  });

  await run(adapter);

  expect(backend.calls[0]?.init.headers).toEqual({
    "content-type": "application/vnd.search+json",
    "x-tenant": "eu",
  });
});
