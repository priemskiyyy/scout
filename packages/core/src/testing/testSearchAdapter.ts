import type { SearchAdapterConformanceFixtures } from "src/testing/types/SearchAdapterConformanceFixtures";
import type { SearchAdapterConformanceOptions } from "src/testing/types/SearchAdapterConformanceOptions";
import { describe, expect, test } from "vitest";
import { SearchDisposedError } from "src/errors/SearchDisposedError";
import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import type { AnySearchAdapter } from "src/types/AnySearchAdapter";
import type { FilterExpression } from "src/types/FilterExpression";

const ACCURACIES = ["exact", "estimated", "lower-bound", "unknown"];

const request = (
  fixtures: SearchAdapterConformanceFixtures,
  overrides: Partial<AdapterSearchRequest<never>> = {},
): AdapterSearchRequest<never> => ({
  index: fixtures.index,
  query: fixtures.query,
  profile: fixtures.profile,
  sort: fixtures.sort,
  filter: { type: "constant", value: true },
  facets: [],
  highlights: [],
  page: { current: 1, size: 10 },
  provider: null,
  ...overrides,
});

/**
 * Registers translation and lifecycle tests for an adapter's declared
 * capabilities. Engine-specific ranking belongs in the adapter's own tests.
 *
 * @example
 * ```ts
 * testSearchAdapter({
 *   name: "typesense",
 *   createAdapter: () => typesense({ client, collection: "products", ... }),
 *   fixtures: { index: "products", query: "shoe", sort: "relevance", ... },
 * });
 * ```
 */
export const testSearchAdapter = ({
  name,
  createAdapter,
  fixtures,
}: SearchAdapterConformanceOptions) => {
  // Dispose fixtures even when an assertion fails.
  const withAdapter = async (
    run: (adapter: AnySearchAdapter) => void | Promise<void>,
  ): Promise<void> => {
    const adapter = createAdapter();
    try {
      await run(adapter);
    } finally {
      adapter.dispose();
    }
  };

  // Conformance requests must stay within the adapter's declared limit.
  const pageSizeFor = (adapter: AnySearchAdapter, wanted: number) => {
    const max = adapter.capabilities.pagination.maxPageSize;
    if (max === null) {
      return wanted;
    }
    return Math.min(wanted, max);
  };

  const search = (
    adapter: AnySearchAdapter,
    overrides: Partial<AdapterSearchRequest<never>> = {},
  ) => {
    const built = request(fixtures, overrides);
    return adapter.search(
      {
        ...built,
        page: { ...built.page, size: pageSizeFor(adapter, built.page.size) },
      },
      { signal: new AbortController().signal },
    );
  };

  describe(`${name} adapter conformance`, () => {
    test("it names itself and declares what it can do", () =>
      withAdapter((adapter) => {
        expect(typeof adapter.name).toBe("string");
        expect(adapter.name.length).toBeGreaterThan(0);
        expect(typeof adapter.capabilities.highlights).toBe("string");
        expect(["logical", "transport"]).toContain(
          adapter.capabilities.cancellation,
        );
      }));

    test("it covers the sort and profile it was asked for", () =>
      withAdapter((adapter) => {
        expect(Object.keys(adapter.sorts)).toContain(fixtures.sort);
        expect(Object.keys(adapter.profiles)).toContain(fixtures.profile);
      }));

    test("its fingerprint identifies the target without carrying a secret", () =>
      withAdapter((adapter) => {
        const fingerprint = adapter.fingerprint();

        expect(typeof fingerprint).toBe("string");
        expect(fingerprint.length).toBeGreaterThan(0);
        // An index legitimately named "tokens" is not a leak. A credential is
        // a name bound to a value, so that is what this looks for, rather
        // than for the word anywhere in the string.
        expect(fingerprint).not.toMatch(
          /(api[\s_-]?key|secret|token|password|passwd|bearer|authorization)["'\s]*[:=]\s*\S/i,
        );
        expect(fingerprint).not.toMatch(/bearer\s+\S/i);
      }));

    test("a search answers with the whole contract shape", () =>
      withAdapter(async (adapter) => {
        const response = await search(adapter);

        expect(Array.isArray(response.hits)).toBe(true);
        expect(response.page.kind).toBe("page");
        expect(ACCURACIES).toContain(response.total.accuracy);
        expect(typeof response.facets).toBe("object");
        expect(response).toHaveProperty("native");
        expect(
          response.took === null || typeof response.took === "number",
        ).toBe(true);
      }));

    test("pages are one based and echo what was asked for", () =>
      withAdapter(async (adapter) => {
        const size = pageSizeFor(adapter, 2);
        const response = await search(adapter, {
          page: { current: 1, size: size },
        });

        expect(response.page.current).toBe(1);
        expect(response.page.size).toBe(size);
        expect(response.page.previous).toBeNull();
        expect(response.hits.length).toBeLessThanOrEqual(size);
      }));

    test("a second page reports the first as its previous", () =>
      withAdapter(async (adapter) => {
        const response = await search(adapter, {
          page: { current: 2, size: pageSizeFor(adapter, 2) },
        });

        expect(response.page.current).toBe(2);
        expect(response.page.previous).toBe(1);
      }));

    test("an equality filter is translated rather than ignored", () =>
      withAdapter(async (adapter) => {
        if (!adapter.capabilities.filters.eq) {
          return;
        }
        const matching: FilterExpression = {
          type: "comparison",
          field: fixtures.equality.field,
          operator: "eq",
          value: fixtures.equality.value,
        };
        const filtered = await search(adapter, { filter: matching });

        if (fixtures.evaluatesFilters !== true) {
          // Nothing behind this adapter applies the filter, so which documents
          // came back says nothing about the translation.
          expect(Array.isArray(filtered.hits)).toBe(true);
          return;
        }
        // Comparing only the counts cannot detect a dropped filter: an adapter
        // that ignores it returns the same hits and `n <= n` passes. Every hit
        // has to actually carry the value.
        expect(filtered.hits.length).toBeGreaterThan(0);
        for (const hit of filtered.hits) {
          const document =
            hit.document !== null && typeof hit.document === "object"
              ? { ...hit.document }
              : {};
          expect(
            Object.getOwnPropertyDescriptor(document, fixtures.equality.field)
              ?.value,
          ).toEqual(fixtures.equality.value);
        }
      }));

    // Every engine's filter grammar gives at least one of these characters a
    // meaning, so an adapter that interpolates a value instead of escaping it
    // builds a filter that means something else or does not parse at all.
    test("a value carrying a quote, a backslash and a colon is escaped", () =>
      withAdapter(async (adapter) => {
        if (!adapter.capabilities.filters.eq) {
          return;
        }
        const response = await search(adapter, {
          filter: {
            type: "comparison",
            field: fixtures.equality.field,
            operator: "eq",
            value: 'a"b\\c:d',
          },
        });

        expect(Array.isArray(response.hits)).toBe(true);
      }));

    // Not gated on boolean composition: `normalizeFilter` turns an empty
    // `in()` into a constant, so an adapter that declares no composition at
    // all still receives one and still has to answer it.
    test("a contradiction returns nothing, so a constant is really translated", () =>
      withAdapter(async (adapter) => {
        const facet = fixtures.facet;
        const wanted =
          adapter.capabilities.facets.resultScoped && facet !== undefined
            ? [facet]
            : [];
        const response = await search(adapter, {
          filter: { type: "constant", value: false },
          facets: wanted,
        });

        expect(response.hits).toHaveLength(0);
        for (const field of wanted) {
          expect(response.facets[field]).toMatchObject({
            field,
            values: [],
            exhaustive: true,
          });
        }
      }));

    test("a range filter keeps only what falls inside it", () =>
      withAdapter(async (adapter) => {
        const range = fixtures.range;
        // The request below is an `and` of two comparisons, so it needs both
        // capabilities and not only the comparison one.
        if (
          !adapter.capabilities.filters.comparison ||
          !adapter.capabilities.filters.booleanComposition ||
          range === undefined
        ) {
          return;
        }
        const response = await search(adapter, {
          filter: {
            type: "and",
            expressions: [
              {
                type: "comparison",
                field: range.field,
                operator: "gte",
                value: range.min,
              },
              {
                type: "comparison",
                field: range.field,
                operator: "lte",
                value: range.max,
              },
            ],
          },
        });

        if (fixtures.evaluatesFilters !== true) {
          expect(Array.isArray(response.hits)).toBe(true);
          return;
        }
        // Asserting only that an array came back passes for an adapter that
        // ignored the range entirely, which is the bug this test exists for.
        expect(response.hits.length).toBeGreaterThan(0);
        for (const hit of response.hits) {
          const document =
            hit.document !== null && typeof hit.document === "object"
              ? { ...hit.document }
              : {};
          const value = Object.getOwnPropertyDescriptor(
            document,
            range.field,
          )?.value;
          expect(typeof value).toBe("number");
          expect(value).toBeGreaterThanOrEqual(range.min);
          expect(value).toBeLessThanOrEqual(range.max);
        }
      }));

    test("a requested facet comes back with counts and an exhaustiveness answer", () =>
      withAdapter(async (adapter) => {
        const facet = fixtures.facet;
        if (!adapter.capabilities.facets.resultScoped || facet === undefined) {
          return;
        }
        const response = await search(adapter, { facets: [facet] });
        const returned = response.facets[facet];

        expect(returned?.field).toBe(facet);
        expect(returned?.values.length).toBeGreaterThan(0);
        for (const bucket of returned?.values ?? []) {
          expect(typeof bucket.count).toBe("number");
        }
        expect([true, false, "unknown"]).toContain(returned?.exhaustive);
      }));

    test("a requested highlight comes back as parts and never as markup", () =>
      withAdapter(async (adapter) => {
        const field = fixtures.highlight;
        if (
          adapter.capabilities.highlights !== "parts" ||
          field === undefined
        ) {
          return;
        }
        const response = await search(adapter, { highlights: [field] });

        for (const hit of response.hits) {
          const document =
            hit.document !== null && typeof hit.document === "object"
              ? { ...hit.document }
              : {};
          const original = Object.getOwnPropertyDescriptor(
            document,
            field,
          )?.value;
          for (const fragment of hit.highlights[field] ?? []) {
            expect(fragment.parts.length).toBeGreaterThan(0);
            for (const part of fragment.parts) {
              expect(typeof part.matched).toBe("boolean");
            }
            // The real invariant is that the adapter's own markers are gone and
            // nothing else was. Rejoining the parts has to give back exactly the
            // field, which catches a leaked marker and a corrupted slice at once,
            // and does not punish a document that legitimately contains markup.
            // A truncated fragment is a snippet, so it cannot be compared.
            if (fragment.truncated === false && typeof original === "string") {
              expect(fragment.parts.map((part) => part.text).join("")).toBe(
                original,
              );
            }
          }
        }
      }));

    test("every hit carries its native payload", () =>
      withAdapter(async (adapter) => {
        const response = await search(adapter);

        // Without this the loop below runs zero assertions on a quiet corpus.
        expect(response.hits.length).toBeGreaterThan(0);
        for (const hit of response.hits) {
          expect(hit.native).toBeDefined();
          expect(hit.document).toBeDefined();
        }
      }));

    test("disposal can be called twice", () =>
      withAdapter((adapter) => {
        adapter.dispose();
        expect(() => adapter.dispose()).not.toThrow();
      }));

    test("a search after disposal is refused", () =>
      withAdapter(async (adapter) => {
        adapter.dispose();

        await expect(search(adapter)).rejects.toThrowError(SearchDisposedError);
      }));

    test("an aborted search rejects rather than answering", () =>
      withAdapter(async (adapter) => {
        const controller = new AbortController();
        controller.abort();

        await expect(
          adapter.search(request(fixtures), { signal: controller.signal }),
        ).rejects.toThrow();
      }));
  });
};
