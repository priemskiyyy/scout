import { expect, test } from "vitest";

import { createMockSearchAdapter } from "src/mock/createMockSearchAdapter";
import type { AdapterSearchHit } from "src/types/AdapterSearchHit";
import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import type { AdapterSearchResponse } from "src/types/AdapterSearchResponse";
import type { HighlightFragment } from "src/types/HighlightFragment";
import type { IndexDeclaration } from "src/types/IndexDeclaration";
import { createFilterFields } from "src/utils/internal/createFilterFields";
import type { IndexRuntime } from "src/utils/internal/IndexRuntime";
import { mapSearchResponse } from "src/utils/internal/mapSearchResponse";
import { product } from "src/utils/internal/testSchema.fixture";
import { productIndex } from "src/utils/internal/testScout.fixture";

const getRuntime = (
  declaration: IndexDeclaration = productIndex,
): IndexRuntime => ({
  name: "products",
  declaration,
  adapter: createMockSearchAdapter().adapter,
  closed: new AbortController().signal,
  fields: createFilterFields(declaration.filterable),
});

const getRequest = (
  overrides: Partial<AdapterSearchRequest<unknown>> = {},
): AdapterSearchRequest<unknown> => ({
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
  ...overrides,
});

const getResponse = (
  overrides: Partial<AdapterSearchResponse<unknown, unknown>> = {},
): AdapterSearchResponse<unknown, unknown> => ({
  hits: [],
  total: { value: 0, accuracy: "exact", scope: "matches" },
  facets: {},
  took: null,
  native: null,
  ...overrides,
});

const getHit = (
  document: unknown,
  highlights: Record<string, readonly HighlightFragment[]> = {},
): AdapterSearchHit<unknown> => ({
  document,
  highlights,
  native: { score: 1 },
});

/** A highlight record that says how often the mapping read it. */
const getCountedHighlights = (
  reads: string[],
): Record<string, readonly HighlightFragment[]> =>
  Object.defineProperty({}, "name", {
    enumerable: true,
    get: () => {
      reads.push("name");

      return [];
    },
  });

const skipping: IndexDeclaration = { ...productIndex, validate: "skip" };

test("a valid hit carries its id, its document and every requested highlight", () => {
  const fragment: HighlightFragment = {
    path: ["name"],
    parts: [{ text: "shoe", matched: true }],
    truncated: false,
  };

  const result = mapSearchResponse({
    runtime: getRuntime(),
    request: getRequest({ highlights: ["name", "brand"] }),
    response: getResponse({ hits: [getHit(product(), { name: [fragment] })] }),
    elapsed: 4,
  });

  expect(result.hits).toEqual([
    {
      id: "p1",
      document: product(),
      // A requested field the engine did not highlight is present and empty.
      highlights: { name: [fragment], brand: [] },
      native: { score: 1 },
    },
  ]);
  expect(result.skipped).toBe(0);
});

test("a document the schema rejects fails the search, saying why and how to skip it", () => {
  expect(() =>
    mapSearchResponse({
      runtime: getRuntime(),
      request: getRequest(),
      response: getResponse({ hits: [getHit({ id: "p1" })] }),
      elapsed: 0,
    }),
  ).toThrowError(
    expect.objectContaining({
      code: "validation",
      message:
        'A document from products did not match its schema. Set validate: "skip" on the index to drop such documents instead. The schema said: Not a product.',
      cause: [{ message: "Not a product." }],
    }),
  );
});

test("validate skip drops the document and counts it", () => {
  const result = mapSearchResponse({
    runtime: getRuntime(skipping),
    request: getRequest(),
    response: getResponse({ hits: [getHit({ id: "p1" }), getHit(product())] }),
    elapsed: 0,
  });

  expect(result.hits.map((hit) => hit.id)).toEqual(["p1"]);
  expect(result.skipped).toBe(1);
});

// A dropped document used to pay for a highlight record before anything looked
// at whether it was a document at all.
test("a dropped document never pays for a highlight record", () => {
  const dropped: string[] = [];
  const kept: string[] = [];

  mapSearchResponse({
    runtime: getRuntime(skipping),
    request: getRequest({ highlights: ["name"] }),
    response: getResponse({
      hits: [
        getHit({ id: "p1" }, getCountedHighlights(dropped)),
        getHit(product(), getCountedHighlights(kept)),
      ],
    }),
    elapsed: 0,
  });

  expect(dropped).toEqual([]);
  expect(kept).toEqual(["name"]);
});

test("a rejecting asynchronous schema is refused without an unhandled rejection", async () => {
  const asynchronous: IndexDeclaration = {
    ...productIndex,
    schema: {
      "~standard": {
        version: 1,
        vendor: "rejecting-test-schema",
        validate: async () => {
          throw new Error("Async schema failure");
        },
      },
    },
  };

  expect(() =>
    mapSearchResponse({
      runtime: getRuntime(asynchronous),
      request: getRequest(),
      response: getResponse({ hits: [getHit(product())] }),
      elapsed: 0,
    }),
  ).toThrowError(expect.objectContaining({ code: "validation" }));

  // Let the runtime report an unobserved schema rejection to the test runner.
  await new Promise((resolve) => setImmediate(resolve));
});

// Never a fabricated empty count: an engine that said nothing about a facet is
// reported as having said nothing.
test("a requested facet the engine skipped comes back unknown", () => {
  const result = mapSearchResponse({
    runtime: getRuntime(),
    request: getRequest({ facets: ["brand"] }),
    response: getResponse(),
    elapsed: 0,
  });

  expect(result.facets).toEqual({
    brand: { field: "brand", values: [], exhaustive: "unknown", native: null },
  });
});

// Some engines, Typesense among them, report every facet value as a string.
test("facet values are decoded to the type the index declared", () => {
  const result = mapSearchResponse({
    runtime: getRuntime(),
    request: getRequest({ facets: ["brand", "inStock", "price"] }),
    response: getResponse({
      facets: {
        brand: {
          values: [{ value: "Nike", count: 2 }],
          exhaustive: true,
          native: { raw: 1 },
        },
        inStock: {
          values: [{ value: "true", count: 1 }],
          exhaustive: false,
          native: null,
        },
        price: {
          values: [{ value: "12.5", count: 3 }],
          exhaustive: "unknown",
          native: null,
        },
      },
    }),
    elapsed: 0,
  });

  expect(result.facets).toEqual({
    brand: {
      field: "brand",
      values: [{ value: "Nike", count: 2 }],
      exhaustive: true,
      native: { raw: 1 },
    },
    inStock: {
      field: "inStock",
      values: [{ value: true, count: 1 }],
      exhaustive: false,
      native: null,
    },
    price: {
      field: "price",
      values: [{ value: 12.5, count: 3 }],
      exhaustive: "unknown",
      native: null,
    },
  });
});

test("a facet value that is not of its declared type is the engine's failure", () => {
  expect(() =>
    mapSearchResponse({
      runtime: getRuntime(),
      request: getRequest({ facets: ["price"] }),
      response: getResponse({
        facets: {
          price: {
            values: [{ value: "cheap", count: 1 }],
            exhaustive: true,
            native: null,
          },
        },
      }),
      elapsed: 0,
    }),
  ).toThrowError(
    expect.objectContaining({
      code: "provider",
      message:
        'The mock facet price returned "cheap", which is not a value of its declared type.',
    }),
  );
});

test("inherited properties cannot masquerade as returned facets or highlights", () => {
  const declaration: IndexDeclaration = {
    ...productIndex,
    facetable: Object.fromEntries([["constructor", "string"]]),
  };

  const result = mapSearchResponse({
    runtime: getRuntime(declaration),
    request: getRequest({ facets: ["constructor"], highlights: ["toString"] }),
    response: getResponse({ hits: [getHit(product())] }),
    elapsed: 0,
  });

  expect(result.facets["constructor"]).toEqual({
    field: "constructor",
    values: [],
    exhaustive: "unknown",
    native: null,
  });
  expect(result.hits[0]?.highlights["toString"]).toEqual([]);
});

test("prototype-named fields remain own properties on mapped results", () => {
  const field = "__proto__";

  const declaration: IndexDeclaration = {
    ...productIndex,
    facetable: Object.fromEntries([[field, "string"]]),
  };

  const fragments: readonly HighlightFragment[] = [
    {
      path: [field],
      parts: [{ text: "shoe", matched: true }],
      truncated: false,
    },
  ];

  const facet = {
    values: [{ value: "shoe", count: 1 }],
    exhaustive: true,
    native: null,
  };

  const result = mapSearchResponse({
    runtime: getRuntime(declaration),
    request: getRequest({ facets: [field], highlights: [field] }),
    response: getResponse({
      hits: [getHit(product(), Object.fromEntries([[field, fragments]]))],
      facets: Object.fromEntries([[field, facet]]),
    }),
    elapsed: 0,
  });

  const highlights = result.hits[0]?.highlights ?? {};

  expect(Object.hasOwn(result.facets, field)).toBe(true);
  expect(result.facets[field]).toEqual({ field, ...facet });
  expect(Object.hasOwn(highlights, field)).toBe(true);
  expect(highlights[field]).toEqual(fragments);
});

test("the page is derived from the total and how many hits came back", () => {
  const result = mapSearchResponse({
    runtime: getRuntime(),
    request: getRequest({ page: { current: 1, size: 1 } }),
    response: getResponse({
      hits: [getHit(product())],
      total: { value: 2, accuracy: "exact", scope: "matches" },
    }),
    elapsed: 0,
  });

  expect(result.page).toEqual({ current: 1, size: 1, next: 2, previous: null });
});

test("the engine's own time wins, and the core's measurement fills in for it", () => {
  const reported = mapSearchResponse({
    runtime: getRuntime(),
    request: getRequest(),
    response: getResponse({ took: 7 }),
    elapsed: 40,
  });

  const measured = mapSearchResponse({
    runtime: getRuntime(),
    request: getRequest(),
    response: getResponse(),
    elapsed: 40,
  });

  expect(reported.took).toEqual({ milliseconds: 7, source: "provider" });
  expect(measured.took).toEqual({ milliseconds: 40, source: "scout" });
});
