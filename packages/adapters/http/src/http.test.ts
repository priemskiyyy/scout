import {
  SearchAbortedError,
  SearchConfigurationError,
  SearchProviderError,
} from "@priemskiyyy/scout";
import type {
  AdapterSearchRequest,
  AnySearchAdapter,
} from "@priemskiyyy/scout";
import { expect, test, vi } from "vitest";
import { http } from "src/http";
import type { HttpCapabilities } from "src/types/HttpCapabilities";
import { createSearchBackend, PRODUCTS } from "src/http.fixture";
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

/** The rejection itself, so several things about it can be asserted. */
const failureOf = async (promise: Promise<unknown>): Promise<Error> => {
  try {
    await promise;
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
    throw new Error("The search rejected with something that is not an Error.");
  }
  throw new Error("The search resolved when it was expected to reject.");
};

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

test("a refused response carries the status and a slice of the body, and no credential", async () => {
  const backend = createSearchBackend({
    status: 503,
    body: `overloaded: ${"detail ".repeat(200)}`,
  });
  const adapter = http({
    endpoint: ENDPOINT,
    fetch: backend.fetch,
    headers: { authorization: "Bearer super-secret" },
    capabilities: CAPABILITIES,
    sorts: { relevance: null },
    profiles: { default: null },
    toRequest: scoutWireRequest,
    fromResponse: scoutWireResponse,
  });

  const error = await failureOf(run(adapter));

  expect(error).toBeInstanceOf(SearchProviderError);
  expect(error.message).toContain("status 503");
  expect(error.message).toContain("overloaded: detail");
  // Truncated rather than the whole page, and the headers that carried the
  // token are nowhere near it.
  expect(error.message.endsWith("...")).toBe(true);
  expect(error.message.length).toBeLessThan(320);
  expect(error.message).not.toContain("super-secret");
});

test("a body that is not JSON says so instead of surfacing a SyntaxError", async () => {
  const backend = createSearchBackend({ body: "<html>gateway</html>" });

  const error = await failureOf(run(wireAdapter(backend)));

  expect(error).toBeInstanceOf(SearchProviderError);
  expect(error.message).toBe(
    "The http search of products answered with a body that is not JSON.",
  );
  expect(error.cause).toBeInstanceOf(SyntaxError);
});

test("an aborted search rejects and the backend really saw the signal", async () => {
  const backend = createSearchBackend({ pending: true });
  const controller = new AbortController();

  const pending = run(wireAdapter(backend), {}, controller.signal);
  await vi.waitFor(() => expect(backend.calls).toHaveLength(1));
  expect(backend.calls[0]?.init.signal.aborted).toBe(false);
  controller.abort();
  const error = await failureOf(pending);

  expect(error).toBeInstanceOf(SearchAbortedError);
  expect(backend.calls[0]?.init.signal.aborted).toBe(true);
});

test("a filter that matches nothing is answered without a request", async () => {
  const backend = createSearchBackend();

  const response = await run(wireAdapter(backend), {
    filter: { type: "constant", value: false },
    page: { current: 2, size: 5 },
  });

  expect(backend.calls).toHaveLength(0);
  expect(response).toEqual({
    hits: [],
    page: { kind: "page", current: 2, size: 5, next: null, previous: 1 },
    total: { value: 0, accuracy: "exact", scope: "matches" },
    facets: {},
    took: null,
    native: null,
  });
});

test("the fingerprint names the endpoint with the credential stripped out", () => {
  const backend = createSearchBackend();
  const build = (endpoint: string) =>
    http({
      endpoint,
      fetch: backend.fetch,
      capabilities: CAPABILITIES,
      sorts: { relevance: null },
      profiles: { default: null },
      toRequest: scoutWireRequest,
      fromResponse: scoutWireResponse,
    });

  expect(
    build("https://reader:hunter2@api.test/search?apiKey=secret").fingerprint(),
  ).toBe("https://api.test/search");
  expect(build("/api/search?token=secret#page").fingerprint()).toBe(
    "/api/search",
  );
  expect(
    build("https://api.test:8108/collections/products").fingerprint(),
  ).toBe("https://api.test:8108/collections/products");
});

test("an endpoint built per request needs a fingerprint of its own", async () => {
  const backend = createSearchBackend();
  const build = (fingerprint?: () => string) =>
    http({
      endpoint: (search) => `https://api.test/${search.index}/search`,
      fetch: backend.fetch,
      capabilities: CAPABILITIES,
      sorts: { relevance: null },
      profiles: { default: null },
      toRequest: scoutWireRequest,
      fromResponse: scoutWireResponse,
      ...(typeof fingerprint === "function" ? { fingerprint } : {}),
    });

  expect(() => build()).toThrowError(SearchConfigurationError);
  expect(() => build()).toThrowError(/Pass fingerprint/);

  const adapter = build(() => "https://api.test/products");
  await run(adapter);

  expect(adapter.fingerprint()).toBe("https://api.test/products");
  expect(backend.calls[0]?.url).toBe("https://api.test/products/search");
});

test("a runtime with no fetch fails at construction naming the option", () => {
  vi.stubGlobal("fetch", undefined);
  try {
    const build = () =>
      http({
        endpoint: ENDPOINT,
        capabilities: CAPABILITIES,
        sorts: { relevance: null },
        profiles: { default: null },
        toRequest: scoutWireRequest,
        fromResponse: scoutWireResponse,
      });

    expect(build).toThrowError(SearchConfigurationError);
    expect(build).toThrowError(/pass fetch/);
  } finally {
    vi.unstubAllGlobals();
  }
});

test("the runtime's own fetch is the default, and it is what native carries", () => {
  const adapter = http({
    endpoint: ENDPOINT,
    capabilities: CAPABILITIES,
    sorts: { relevance: null },
    profiles: { default: null },
    toRequest: scoutWireRequest,
    fromResponse: scoutWireResponse,
  });

  expect(adapter.native).toBe(globalThis.fetch);
});

test("the declared capabilities travel as given, and fetch really cancels", () => {
  const backend = createSearchBackend();
  const adapter = wireAdapter(backend);

  expect(adapter.capabilities).toEqual({
    ...CAPABILITIES,
    cancellation: "transport",
  });
  expect(adapter.reservedOptions).toEqual([]);
  expect(
    http({
      endpoint: ENDPOINT,
      fetch: backend.fetch,
      // A gateway that replays the request keeps working after the connection
      // drops, and an application that knows that says so.
      capabilities: { ...CAPABILITIES, cancellation: "logical" },
      sorts: { relevance: null },
      profiles: { default: null },
      reservedOptions: ["filter"],
      toRequest: scoutWireRequest,
      fromResponse: scoutWireResponse,
    }).capabilities.cancellation,
  ).toBe("logical");
});

test("the scout wire response round trips every field it describes", async () => {
  const hit = {
    document: { id: "1", title: "Trail running shoe" },
    highlights: {
      title: [
        {
          parts: [
            { text: "Trail running ", matched: false },
            { text: "shoe", matched: true },
          ],
          truncated: false,
        },
      ],
    },
    score: 2.5,
  };
  const body = {
    hits: [hit],
    total: { value: 40, accuracy: "estimated", scope: "retrievable" },
    facets: {
      brand: { values: [{ value: "Apex", count: 12 }], exhaustive: false },
    },
    took: 7,
    hasMore: true,
  };
  const backend = createSearchBackend({ body: JSON.stringify(body) });

  const response = await run(wireAdapter(backend), {
    page: { current: 2, size: 5 },
  });

  expect(response.hits).toEqual([
    {
      document: { id: "1", title: "Trail running shoe" },
      highlights: {
        title: [
          {
            path: ["title"],
            parts: [
              { text: "Trail running ", matched: false },
              { text: "shoe", matched: true },
            ],
            truncated: false,
          },
        ],
      },
      native: hit,
    },
  ]);
  expect(response.total).toEqual({
    value: 40,
    accuracy: "estimated",
    scope: "retrievable",
  });
  // `hasMore` is the backend's own answer, so it wins over the total.
  expect(response.page).toEqual({
    kind: "page",
    current: 2,
    size: 5,
    next: 3,
    previous: 1,
  });
  expect(response.facets.brand).toEqual({
    field: "brand",
    values: [{ value: "Apex", count: 12 }],
    exhaustive: false,
    native: body.facets.brand,
  });
  expect(response.took).toBe(7);
  expect(response.native).toEqual(body);
});

test("a counted total decides the next page when the backend does not", async () => {
  const body = JSON.stringify({
    hits: [],
    total: { value: 30, accuracy: "exact" },
  });

  const first = await run(wireAdapter(createSearchBackend({ body })), {
    page: { current: 1, size: 10 },
  });
  const last = await run(wireAdapter(createSearchBackend({ body })), {
    page: { current: 3, size: 10 },
  });

  expect(first.page.next).toBe(2);
  expect(last.page.next).toBeNull();
});

test("a backend that reports no total reports an unknown one, not a guess", async () => {
  const backend = createSearchBackend({
    body: JSON.stringify({ hits: [{ document: { id: "1" } }] }),
  });

  const response = await run(wireAdapter(backend));

  expect(response.total).toEqual({ accuracy: "unknown", scope: "unknown" });
  expect(response.page.next).toBe("unknown");
  expect(response.facets).toEqual({});
  expect(response.took).toBeNull();
});

test("a body the wire format does not describe is refused field by field", async () => {
  const cases = [
    { body: `"a string"`, detail: "the body is not a JSON object" },
    {
      body: `{"total":{"value":1,"accuracy":"exact"}}`,
      detail: "hits is not an array",
    },
    { body: `{"hits":[{"id":"1"}]}`, detail: "a hit has no document" },
    {
      body: `{"hits":[],"total":{"value":"many"}}`,
      detail: "total needs a numeric value",
    },
    {
      body: `{"hits":[],"facets":{"brand":{"exhaustive":true}}}`,
      detail: "facet brand has no values array",
    },
    {
      body: `{"hits":[],"facets":{"brand":{"values":[{"value":"Apex"}]}}}`,
      detail: "facet brand has a bucket without a numeric count",
    },
  ];

  for (const { body, detail } of cases) {
    const error = await failureOf(
      run(wireAdapter(createSearchBackend({ body }))),
    );

    expect(error).toBeInstanceOf(SearchProviderError);
    expect(error.message).toContain(detail);
  }
});

test("malformed highlight metadata is dropped rather than repaired", async () => {
  const backend = createSearchBackend({
    body: JSON.stringify({
      hits: [
        {
          document: { id: "1" },
          highlights: {
            title: [{ parts: [{ matched: true }] }],
            summary: [{ parts: [{ text: "a ", matched: false }] }],
            tags: "not fragments",
          },
        },
      ],
    }),
  });

  const response = await run(wireAdapter(backend));

  // A part with no text cannot be rendered and a fabricated match is worse
  // than no highlight, so only the well formed field survives.
  expect(response.hits[0]?.highlights).toEqual({
    summary: [
      {
        path: ["summary"],
        parts: [{ text: "a ", matched: false }],
        truncated: "unknown",
      },
    ],
  });
});

test("a hand written mapping needs neither wire helper", async () => {
  const backend = createSearchBackend();
  const adapter = http({
    endpoint: ENDPOINT,
    fetch: backend.fetch,
    capabilities: CAPABILITIES,
    sorts: { relevance: null },
    profiles: { default: null },
    toRequest: (search) => ({ q: search.query, size: search.page.size }),
    fromResponse: (body, search) => {
      if (
        typeof body !== "object" ||
        body === null ||
        !("hits" in body) ||
        !Array.isArray(body.hits)
      ) {
        throw new Error("Expected a hits array.");
      }
      return {
        hits: body.hits.map((row: unknown) => {
          if (typeof row !== "object" || row === null || !("document" in row)) {
            throw new Error("Expected a document.");
          }
          return { document: row.document, highlights: {}, native: row };
        }),
        page: {
          kind: "page",
          current: search.page.current,
          size: search.page.size,
          next: null,
          previous: null,
        },
        total: { accuracy: "unknown", scope: "unknown" },
        facets: {},
        took: null,
        native: body,
      };
    },
  });

  const response = await run(adapter);

  expect(JSON.parse(backend.calls[0]?.init.body ?? "null")).toEqual({
    q: "shoe",
    size: 10,
  });
  // The fake has no idea what `q` and `size` mean, which is the point: the
  // body is the application's, and nothing in the package assumes a shape.
  expect(response.hits).toHaveLength(PRODUCTS.length);
  expect(response.total).toEqual({ accuracy: "unknown", scope: "unknown" });
});
