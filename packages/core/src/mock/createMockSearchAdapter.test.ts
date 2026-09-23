import { expect, test } from "vitest";

import { createMockSearchAdapter } from "src/mock/createMockSearchAdapter";
import type { MockSearchResponse } from "src/mock/types/MockSearchResponse";
import { testSearchAdapter } from "src/testing/testSearchAdapter";
import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import { product } from "src/utils/internal/testSchema.fixture";
import { productIndex } from "src/utils/internal/testScout.fixture";

const REQUEST: AdapterSearchRequest<Readonly<Record<string, unknown>>> = {
  index: "products",
  query: "shoe",
  searchable: ["name"],
  profile: "default",
  sort: null,
  filter: null,
  facets: [],
  highlights: [],
  page: { current: 1, size: 10 },
  provider: null,
};

const getResponse = (native: unknown): MockSearchResponse => ({
  hits: [],
  total: { value: 0, accuracy: "exact", scope: "matches" },
  facets: {},
  took: null,
  native,
});

const getContext = () => ({ signal: new AbortController().signal });

test("a held request is recorded and answers only when the test settles it", async () => {
  const { adapter, requests } = createMockSearchAdapter({ hold: true });
  const pending = adapter.search(REQUEST, getContext());

  expect(requests).toHaveLength(1);
  expect(requests[0]?.request).toBe(REQUEST);
  requests[0]?.settle(getResponse("answered"));

  await expect(pending).resolves.toEqual(getResponse("answered"));
});

test("held requests can be answered out of order", async () => {
  const { adapter, requests } = createMockSearchAdapter({ hold: true });
  const first = adapter.search(REQUEST, getContext());
  const second = adapter.search(REQUEST, getContext());

  requests[1]?.settle(getResponse("second"));
  requests[0]?.settle(getResponse("first"));

  await expect(second).resolves.toEqual(getResponse("second"));
  await expect(first).resolves.toEqual(getResponse("first"));
});

test("a request can be failed with any reason", async () => {
  const { adapter, requests } = createMockSearchAdapter({ hold: true });
  const pending = adapter.search(REQUEST, getContext());
  const reason = new Error("502 Bad Gateway");

  requests[0]?.fail(reason);

  await expect(pending).rejects.toBe(reason);
});

test("an unheld request answers an exact nothing by default", async () => {
  const { adapter } = createMockSearchAdapter();

  await expect(adapter.search(REQUEST, getContext())).resolves.toEqual(
    getResponse(null),
  );
});

test("an unheld request answers what the response option returns", async () => {
  const { adapter } = createMockSearchAdapter({
    response: (request) => getResponse(request.query),
  });

  await expect(adapter.search(REQUEST, getContext())).resolves.toEqual(
    getResponse("shoe"),
  );
});

test("a response option that throws rejects, the way a refusal does", async () => {
  const refusal = new Error("refused");

  const { adapter } = createMockSearchAdapter({
    response: () => {
      throw refusal;
    },
  });

  await expect(adapter.search(REQUEST, getContext())).rejects.toBe(refusal);
});

test("an abort rejects with the signal's reason", async () => {
  const { adapter } = createMockSearchAdapter({ hold: true });
  const controller = new AbortController();
  const pending = adapter.search(REQUEST, { signal: controller.signal });
  const reason = new Error("replaced");

  controller.abort(reason);

  await expect(pending).rejects.toBe(reason);
});

test("a mock that ignores the signal keeps waiting, and still records the abort", async () => {
  const { adapter, requests } = createMockSearchAdapter({
    hold: true,
    ignoreSignal: true,
  });

  const controller = new AbortController();
  const pending = adapter.search(REQUEST, { signal: controller.signal });

  controller.abort();
  expect(requests[0]?.aborted()).toBe(true);
  requests[0]?.settle(getResponse("late"));

  await expect(pending).resolves.toEqual(getResponse("late"));
});

test("the fingerprint, sorts and profiles are the ones configured", () => {
  const sorts = { priceAsc: "products_price_asc" };
  const profiles = { names: { weights: [2] } };

  const { adapter } = createMockSearchAdapter({
    fingerprint: "products@2",
    sorts,
    profiles,
  });

  expect(adapter.fingerprint()).toBe("products@2");
  expect(adapter.sorts).toBe(sorts);
  expect(adapter.profiles).toBe(profiles);
  expect(createMockSearchAdapter().adapter.fingerprint()).toBe("mock");
});

test("disposal is counted, so a test can prove it happened once", () => {
  const mock = createMockSearchAdapter();

  mock.adapter.dispose?.();

  expect(mock.disposals()).toBe(1);
});

// The mock is an adapter, so it passes the suite every adapter passes. It
// evaluates nothing, so the suite checks only the answer's shape.
testSearchAdapter({
  name: "mock",
  index: productIndex,
  createAdapter: () =>
    createMockSearchAdapter({
      response: (request) => ({
        ...getResponse(null),
        hits: [product({ id: "a" }), product({ id: "b" })]
          .slice(0, request.page.size)
          .map((document) => ({ document, highlights: {}, native: {} })),
        total: { value: 2, accuracy: "exact", scope: "matches" },
      }),
    }).adapter,
  fixtures: { query: "shoe", equality: { field: "brand", value: "Nike" } },
});
