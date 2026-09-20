import { expect, test } from "vitest";
import { SearchAbortedError } from "src/errors/SearchAbortedError";
import { SearchDisposedError } from "src/errors/SearchDisposedError";
import { SearchProviderError } from "src/errors/SearchProviderError";
import { createMockSearchAdapter } from "src/mock/createMockSearchAdapter";
import { testSearchAdapter } from "src/testing/testSearchAdapter";

const NAMES = {
  sorts: { relevance: null },
  profiles: { default: null },
} as const;

const searchWith = (
  adapter: ReturnType<typeof createMockSearchAdapter>["adapter"],
  signal: AbortSignal,
) =>
  adapter.search(
    {
      index: "products",
      query: "shoe",
      profile: "default",
      sort: "relevance",
      filter: { type: "constant", value: true },
      facets: [],
      highlights: [],
      page: { current: 1, size: 10 },
      provider: null,
    },
    { signal },
  );

test("a held request is recorded and answers only when the test says so", async () => {
  const { adapter, requests } = createMockSearchAdapter({
    hold: true,
    ...NAMES,
  });
  const pending = searchWith(adapter, new AbortController().signal);

  expect(requests).toHaveLength(1);
  requests[0]?.settle({
    hits: [],
    page: { kind: "page", current: 1, size: 10, next: null, previous: null },
    total: { accuracy: "unknown", scope: "unknown" },
    facets: {},
    took: null,
    native: "answered",
  });

  await expect(pending).resolves.toMatchObject({ native: "answered" });
});

test("the default empty answer includes exhaustive requested facets", async () => {
  const { adapter } = createMockSearchAdapter(NAMES);
  const result = await adapter.search(
    {
      index: "products",
      query: "shoe",
      profile: "default",
      sort: "relevance",
      filter: { type: "constant", value: true },
      facets: ["brand"],
      highlights: [],
      page: { current: 2, size: 10 },
      provider: null,
    },
    { signal: new AbortController().signal },
  );

  expect(result.facets["brand"]).toEqual({
    field: "brand",
    values: [],
    exhaustive: true,
    native: null,
  });
  expect(result.page.previous).toBe(1);
});

test("held requests can be answered out of order", async () => {
  const { adapter, requests } = createMockSearchAdapter({
    hold: true,
    ...NAMES,
  });
  const first = searchWith(adapter, new AbortController().signal);
  const second = searchWith(adapter, new AbortController().signal);

  requests[1]?.settle({
    hits: [],
    page: { kind: "page", current: 1, size: 10, next: null, previous: null },
    total: { accuracy: "unknown", scope: "unknown" },
    facets: {},
    took: null,
    native: "second",
  });
  requests[0]?.settle({
    hits: [],
    page: { kind: "page", current: 1, size: 10, next: null, previous: null },
    total: { accuracy: "unknown", scope: "unknown" },
    facets: {},
    took: null,
    native: "first",
  });

  await expect(second).resolves.toMatchObject({ native: "second" });
  await expect(first).resolves.toMatchObject({ native: "first" });
});

test("an answer arriving after disposal is refused rather than returned", async () => {
  const { adapter, requests } = createMockSearchAdapter({
    hold: true,
    ...NAMES,
  });
  const pending = searchWith(adapter, new AbortController().signal);

  adapter.dispose();
  requests[0]?.settle({
    hits: [],
    page: { kind: "page", current: 1, size: 10, next: null, previous: null },
    total: { accuracy: "unknown", scope: "unknown" },
    facets: {},
    took: null,
    native: "too late",
  });

  await expect(pending).rejects.toThrowError(SearchDisposedError);
});

test("logical cancellation rejects without waiting for an unresponsive provider", async () => {
  const { adapter } = createMockSearchAdapter({
    ...NAMES,
    hold: true,
    ignoreSignal: true,
  });
  const controller = new AbortController();
  const pending = searchWith(adapter, controller.signal);
  controller.abort(new Error("The search was replaced."));

  await expect(pending).rejects.toThrowError(SearchAbortedError);
});

test("disposal rejects without waiting for an unresponsive provider", async () => {
  const { adapter } = createMockSearchAdapter({
    ...NAMES,
    hold: true,
    ignoreSignal: true,
  });
  const pending = searchWith(adapter, new AbortController().signal);
  adapter.dispose();

  await expect(pending).rejects.toThrowError(SearchDisposedError);
});

test("a late answer from an SDK that ignored the abort is refused, not returned", async () => {
  const { adapter, requests } = createMockSearchAdapter({
    hold: true,
    ignoreSignal: true,
    ...NAMES,
  });
  const controller = new AbortController();
  const pending = searchWith(adapter, controller.signal);
  controller.abort();

  expect(requests[0]?.aborted()).toBe(true);
  requests[0]?.settle({
    hits: [],
    page: { kind: "page", current: 1, size: 10, next: null, previous: null },
    total: { accuracy: "unknown", scope: "unknown" },
    facets: {},
    took: null,
    native: "ignored the abort",
  });

  // The engine answered anyway. Scout refuses the answer, which is the whole
  // meaning of logical cancellation.
  await expect(pending).rejects.toThrowError(SearchAbortedError);
});

// A transport cancelling adapter rejects rather than answering, the way fetch
// does. That rejection is a cancellation, not a provider failure, and consumers
// have to be able to tell the two apart.
test("an SDK rejection caused by the abort is reported as a cancellation", async () => {
  // ignoreSignal keeps the mock from rejecting on the signal itself, so the
  // rejection under test is the SDK's own, the way a real client reports it.
  const { adapter, requests } = createMockSearchAdapter({
    hold: true,
    ignoreSignal: true,
    ...NAMES,
  });
  const controller = new AbortController();
  const pending = searchWith(adapter, controller.signal);

  const reason = new Error("The search was replaced.");
  controller.abort(reason);
  requests[0]?.fail(new Error("The operation was aborted."));

  await expect(pending).rejects.toThrowError(SearchAbortedError);
  await expect(pending).rejects.toMatchObject({
    cause: reason,
  });
});

test("a rejection with no abort stays a provider failure and is not disguised", async () => {
  const { adapter, requests } = createMockSearchAdapter({
    hold: true,
    ...NAMES,
  });
  const pending = searchWith(adapter, new AbortController().signal);

  const raw = new Error("502 Bad Gateway");
  requests[0]?.fail(raw);

  // A provider failure now arrives with a code, so a consumer can narrow it,
  // and the SDK's own error is preserved rather than replaced.
  await expect(pending).rejects.toBeInstanceOf(SearchProviderError);
  await expect(pending).rejects.not.toBeInstanceOf(SearchAbortedError);
  await expect(pending).rejects.toMatchObject({
    code: "provider",
    adapter: "mock",
    cause: raw,
  });
});

test("declared capabilities can be narrowed so a subset engine can be simulated", () => {
  const { adapter } = createMockSearchAdapter({
    capabilities: { highlights: "none", cancellation: "logical" },
    ...NAMES,
  });

  expect(adapter.capabilities.highlights).toBe("none");
  expect(adapter.capabilities.cancellation).toBe("logical");
  expect(adapter.capabilities.filters.eq).toBe(true);
});

// The mock is itself an adapter, so it has to pass the suite every other
// adapter passes. This is what keeps the suite honest about its own contract.
testSearchAdapter({
  name: "mock",
  // The default mock answers with no hits, and a suite block that loops over
  // hits then runs no assertions at all. It answers with one here so those
  // blocks are exercised.
  createAdapter: () =>
    createMockSearchAdapter({
      ...NAMES,
      response: (request) => ({
        // A contradiction matches nothing, the way every real adapter answers
        // one, so the suite's constant block stays meaningful.
        hits:
          request.filter.type === "constant" && !request.filter.value
            ? []
            : [
                {
                  document: { id: "p1", brand: "Sony" },
                  highlights: {},
                  native: { score: 1 },
                },
              ],
        page: {
          kind: "page",
          current: request.page.current,
          size: request.page.size,
          next: null,
          previous: request.page.current > 1 ? request.page.current - 1 : null,
        },
        total: {
          value: 1,
          accuracy: "exact" as const,
          scope: "matches" as const,
        },
        facets: {},
        took: null,
        native: null,
      }),
    }).adapter,
  fixtures: {
    index: "products",
    query: "shoe",
    sort: "relevance",
    profile: "default",
    equality: { field: "brand", value: "Sony" },
  },
});
