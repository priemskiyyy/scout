import { expect, test } from "vitest";
import { createMockSearchAdapter } from "src/mock/createMockSearchAdapter";
import { SearchValidationError } from "src/errors/SearchValidationError";
import type { AdapterSearchHit } from "src/types/AdapterSearchHit";
import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import type { AdapterSearchResponse } from "src/types/AdapterSearchResponse";
import type { HighlightFragment } from "src/types/HighlightFragment";
import type { IndexRuntime } from "src/utils/internal/IndexRuntime";
import { mapSearchResponse } from "src/utils/internal/mapSearchResponse";
import {
  ProductSchema,
  product,
  type Product,
} from "src/utils/internal/testSchema.fixture";

/** What the mock adapter takes as provider options. */
type Options = Readonly<Record<string, unknown>>;

const runtime = (
  overrides: Partial<IndexRuntime<Options, Product>> = {},
): IndexRuntime<Options, Product> => ({
  adapter: createMockSearchAdapter({
    sorts: { relevance: null },
    profiles: { default: null },
  }).adapter,
  schema: ProductSchema,
  identify: (document) => document.id,
  validate: "error",
  emptyQuery: "allow",
  isDisposed: () => false,
  ...overrides,
});

const request = (
  overrides: Partial<AdapterSearchRequest<Options>> = {},
): AdapterSearchRequest<Options> => ({
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

const response = (
  overrides: Partial<AdapterSearchResponse<unknown, unknown>> = {},
): AdapterSearchResponse<unknown, unknown> => ({
  hits: [],
  page: { kind: "page", current: 1, size: 10, next: null, previous: null },
  total: { value: 0, accuracy: "exact", scope: "matches" },
  facets: {},
  took: null,
  native: null,
  ...overrides,
});

const hit = (
  document: unknown,
  highlights: Record<string, readonly HighlightFragment[]> = {},
): AdapterSearchHit<unknown> => ({
  document,
  highlights,
  native: { score: 1 },
});

/** A highlight record that says how often the mapping read it. */
const counted = (
  reads: string[],
): Record<string, readonly HighlightFragment[]> =>
  Object.defineProperty({}, "name", {
    enumerable: true,
    get: () => {
      reads.push("name");
      return [];
    },
  });

test("a valid hit carries its id, its document and its requested highlights", () => {
  const fragment: HighlightFragment = {
    path: ["name"],
    parts: [{ text: "shoe", matched: true }],
    truncated: false,
  };
  const result = mapSearchResponse({
    runtime: runtime(),
    request: request({ highlights: ["name", "brand"] }),
    response: response({ hits: [hit(product(), { name: [fragment] })] }),
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

test("a document the schema rejects is refused by default", () => {
  expect(() =>
    mapSearchResponse({
      runtime: runtime(),
      request: request(),
      response: response({ hits: [hit({ id: "p1" })] }),
      elapsed: 0,
    }),
  ).toThrowError(SearchValidationError);
});

test("validate skip drops the document and counts it", () => {
  const result = mapSearchResponse({
    runtime: runtime({ validate: "skip" }),
    request: request(),
    response: response({ hits: [hit({ id: "p1" }), hit(product())] }),
    elapsed: 0,
  });

  expect(result.hits.map((entry) => entry.id)).toEqual(["p1"]);
  expect(result.skipped).toBe(1);
});

// A dropped document used to pay for a highlight record before anything looked
// at whether it was a document at all.
test("a dropped document never pays for a highlight record", () => {
  const dropped: string[] = [];
  const kept: string[] = [];
  const result = mapSearchResponse({
    runtime: runtime({ validate: "skip" }),
    request: request({ highlights: ["name"] }),
    response: response({
      hits: [
        hit({ id: "p1" }, counted(dropped)),
        hit(product(), counted(kept)),
      ],
    }),
    elapsed: 0,
  });

  expect(dropped).toEqual([]);
  expect(kept).toEqual(["name"]);
  expect(result.skipped).toBe(1);
});

// Never a fabricated empty count: an engine that said nothing about a facet is
// reported as having said nothing.
test("a requested facet the engine skipped comes back unknown", () => {
  const result = mapSearchResponse({
    runtime: runtime(),
    request: request({ facets: ["brand"] }),
    response: response(),
    elapsed: 0,
  });

  expect(result.facets).toEqual({
    brand: { field: "brand", values: [], exhaustive: "unknown", native: null },
  });
});

test("inherited properties cannot masquerade as returned facets or highlights", () => {
  const result = mapSearchResponse({
    runtime: runtime(),
    request: request({ facets: ["constructor"], highlights: ["toString"] }),
    response: response({ hits: [hit(product())] }),
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
  const fragments: readonly HighlightFragment[] = [
    {
      path: [field],
      parts: [{ text: "shoe", matched: true }],
      truncated: false,
    },
  ];
  const facet = {
    field,
    values: [{ value: "shoe", count: 1 }],
    exhaustive: true,
    native: null,
  };
  const result = mapSearchResponse({
    runtime: runtime(),
    request: request({ facets: [field], highlights: [field] }),
    response: response({
      hits: [hit(product(), Object.fromEntries([[field, fragments]]))],
      facets: Object.fromEntries([[field, facet]]),
    }),
    elapsed: 0,
  });

  expect(Object.hasOwn(result.facets, field)).toBe(true);
  expect(result.facets[field]).toEqual(facet);
  const highlights = result.hits[0]?.highlights ?? {};
  expect(Object.hasOwn(highlights, field)).toBe(true);
  expect(highlights[field]).toEqual(fragments);
});

test("a rejecting asynchronous schema is refused without an unhandled rejection", async () => {
  expect(() =>
    mapSearchResponse({
      runtime: runtime({
        schema: {
          "~standard": {
            version: 1,
            vendor: "rejecting-test-schema",
            validate: async () => {
              throw new Error("Async schema failure");
            },
          },
        },
      }),
      request: request(),
      response: response({ hits: [hit(product())] }),
      elapsed: 0,
    }),
  ).toThrowError(SearchValidationError);

  // Let the runtime report an unobserved schema rejection to the test runner.
  await new Promise((resolve) => setImmediate(resolve));
});

test("a facet the engine answered is passed through as it came", () => {
  const brand = {
    field: "brand",
    values: [{ value: "Nike", count: 2 }],
    exhaustive: true,
    native: { raw: 1 },
  };
  const result = mapSearchResponse({
    runtime: runtime(),
    request: request({ facets: ["brand"] }),
    response: response({ facets: { brand } }),
    elapsed: 0,
  });

  expect(result.facets["brand"]).toEqual(brand);
});

test("the provider's own time wins, and the core's measurement fills in for it", () => {
  const provider = mapSearchResponse({
    runtime: runtime(),
    request: request(),
    response: response({ took: 7 }),
    elapsed: 40,
  });
  const measured = mapSearchResponse({
    runtime: runtime(),
    request: request(),
    response: response({ took: null }),
    elapsed: 40,
  });

  expect(provider.took).toEqual({ milliseconds: 7, source: "provider" });
  expect(measured.took).toEqual({ milliseconds: 40, source: "scout" });
});
