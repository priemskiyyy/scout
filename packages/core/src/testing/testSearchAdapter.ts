import { describe, expect, test } from "vitest";

import type { SearchAdapterConformanceOptions } from "src/testing/types/SearchAdapterConformanceOptions";
import type { AdapterSort } from "src/types/AdapterSort";
import type { FilterExpression } from "src/types/FilterExpression";
import type { IndexDeclaration } from "src/types/IndexDeclaration";
import type { IndexShape } from "src/types/IndexShape";
import type { SearchBuilder } from "src/types/SearchBuilder";
import type { SearchIndex } from "src/types/SearchIndex";
import { matchesFilter } from "src/utils/matchesFilter";
import { Scout } from "src/utils/Scout";
import { ScoutError } from "src/utils/ScoutError";

const ACCURACIES: readonly unknown[] = [
  "exact",
  "estimated",
  "lower-bound",
  "unknown",
];

const SCOPES: readonly unknown[] = ["matches", "retrievable", "unknown"];

// No document holds it, and every engine's filter grammar gives one of its
// characters a meaning, so a value interpolated rather than escaped builds a
// filter that means something else or does not parse at all.
const ABSENT = 'a"b\\c:d';

// A credential is a name bound to a value. An index legitimately named
// "tokens" is not one, so the word alone is not what this looks for.
const CREDENTIAL =
  /(api[\s_-]?key|secret|token|password|passwd|bearer|authorization)["'\s]*[:=]\s*\S/i;

const getFieldValue = (document: unknown, field: string): unknown => {
  if (document === null || typeof document !== "object") {
    return undefined;
  }

  return Object.getOwnPropertyDescriptor(document, field)?.value;
};

// Engines collate strings differently, so only numbers are held to an order.
const isInOrder = (
  by: AdapterSort["by"],
  earlier: unknown,
  later: unknown,
): boolean => {
  for (const { field, direction } of by) {
    const left = getFieldValue(earlier, field);
    const right = getFieldValue(later, field);

    if (typeof left !== "number" || typeof right !== "number") {
      return true;
    }

    if (left === right) {
      continue;
    }

    if (direction === "asc") {
      return left < right;
    }

    return left > right;
  }

  return true;
};

// An adapter refuses what its engine cannot express, and a refusal passes.
// Any other failure fails the test.
const getResultUnlessRefused = async (
  search: SearchBuilder<IndexShape, string, string>,
) => {
  try {
    return await search.execute();
  } catch (error) {
    if (error instanceof ScoutError && error.code === "unsupported-feature") {
      return null;
    }

    throw error;
  }
};

/**
 * Registers the contract every search adapter must keep. Call it at the top
 * level of `src/conformance.test.ts`. Every search goes through a real
 * `Scout`, so the adapter meets the requests the core resolves, and its
 * answers pass through the core's validation and facet decoding.
 *
 * It checks only what is engine independent: a name, a fingerprint without a
 * secret, the answer's shape and honest total, paging, browsing, the portable
 * filters, and every facet, highlight, sort and profile the index declares.
 * Each feature is either served or refused with `unsupported-feature`.
 *
 * It cannot check that the factory is cold, how a request is translated, or
 * that the signal reaches the engine. Keep those in the adapter's own tests.
 * Cancellation, disposal and contradictions are owned by the core and tested
 * there.
 *
 * @example
 * ```ts
 * testSearchAdapter({
 *   name: "typesense",
 *   index: products,
 *   createAdapter: () => typesense({ client, collection: "products" }),
 *   fixtures: { query: "shoe", equality: { field: "brand", value: "Nimbus" } },
 * });
 * ```
 */
export const testSearchAdapter = <TIndex extends IndexDeclaration>({
  name,
  index,
  createAdapter,
  evaluates = false,
  fixtures,
}: SearchAdapterConformanceOptions<TIndex>) => {
  // Erased, so the suite can name fields by the strings its fixtures hold.
  const declaration: IndexDeclaration = index;

  const equality: FilterExpression = {
    type: "comparison",
    field: fixtures.equality.field,
    operator: "eq",
    value: fixtures.equality.value,
  };

  const withIndex = async (
    run: (products: SearchIndex<IndexShape>) => Promise<void>,
  ) => {
    const scout = new Scout({
      indexes: { conformance: declaration },
      adapters: { conformance: createAdapter() },
    });

    try {
      await run(scout.index("conformance"));
    } finally {
      scout.dispose();
    }
  };

  // Counting alone cannot catch a dropped filter, because an adapter that
  // ignores one returns the same documents. Every hit has to satisfy it.
  const testFilter = (title: string, filter: FilterExpression) =>
    test(title, () =>
      withIndex(async (products) => {
        const result = await getResultUnlessRefused(
          products.search("").where(() => filter),
        );

        if (result === null || !evaluates) {
          return;
        }

        expect(result.hits.length).toBeGreaterThan(0);

        for (const hit of result.hits) {
          expect(matchesFilter(filter, hit.document)).toBe(true);
        }
      }),
    );

  describe(`${name} adapter conformance`, () => {
    test("the adapter names itself", () => {
      const adapter = createAdapter();

      expect(typeof adapter.name).toBe("string");
      expect(adapter.name).not.toBe("");
    });

    test("its fingerprint names what decides the results without carrying a secret", () => {
      const fingerprint = createAdapter().fingerprint();

      expect(typeof fingerprint).toBe("string");
      expect(fingerprint).not.toBe("");
      expect(fingerprint).not.toMatch(CREDENTIAL);
      expect(fingerprint).not.toMatch(/bearer\s+\S/i);
    });

    test("a search answers with documents, an honest total and the native response", () =>
      withIndex(async (products) => {
        const result = await products
          .search(fixtures.query)
          .page({ size: 10 })
          .execute();

        expect(result.hits.length).toBeGreaterThan(0);
        expect(result.hits.length).toBeLessThanOrEqual(10);
        expect(ACCURACIES).toContain(result.total.accuracy);
        expect(SCOPES).toContain(result.total.scope);
        expect(result.native).toBeDefined();

        if (result.total.accuracy !== "unknown") {
          expect(Number.isInteger(result.total.value)).toBe(true);
          expect(result.total.value).toBeGreaterThanOrEqual(0);
        }

        if (result.total.accuracy === "exact") {
          expect(result.total.value).toBeGreaterThanOrEqual(result.hits.length);
        }

        for (const hit of result.hits) {
          expect(hit.native).toBeDefined();
        }
      }));

    test("a page holds at most its size, and the next page holds other documents", () =>
      withIndex(async (products) => {
        const search = products.search(fixtures.query).page({ size: 1 });
        const first = await search.execute();
        const second = await search.page({ current: 2 }).execute();

        expect(first.hits).toHaveLength(1);
        expect(second.hits.length).toBeLessThanOrEqual(1);

        if (!evaluates) {
          return;
        }

        // The query matches at least two documents, so a first page of one
        // has a next, and the second page holds the other.
        expect(first.page.next).not.toBeNull();
        expect(second.hits).toHaveLength(1);
        expect(second.hits[0]?.id).not.toBe(first.hits[0]?.id);
      }));

    test("an empty query browses the index", () =>
      withIndex(async (products) => {
        const result = await products.search("").page({ size: 10 }).execute();

        expect(result.hits.length).toBeGreaterThan(0);
      }));

    testFilter(
      "an equality filter keeps only the documents holding its value",
      equality,
    );

    testFilter("a negated filter keeps only the documents it excludes", {
      type: "not",
      expression: equality,
    });

    testFilter(
      "a set filter keeps only the documents holding one of its values",
      {
        type: "comparison",
        field: fixtures.equality.field,
        operator: "in",
        value: [fixtures.equality.value, ABSENT],
      },
    );

    // An or read as an and answers nothing here, and a dropped one answers
    // documents without the value.
    testFilter("an or keeps the documents matching either side", {
      type: "or",
      expressions: [equality, { ...equality, value: ABSENT }],
    });

    const range = fixtures.range;

    if (range !== undefined) {
      testFilter("a range keeps only what falls inside it", {
        type: "comparison",
        field: range.field,
        operator: "between",
        value: [range.min, range.max],
      });
    }

    test("a value carrying a quote, a backslash and a colon is escaped", () =>
      withIndex(async (products) => {
        const result = await getResultUnlessRefused(
          products.search("").where(() => ({ ...equality, value: ABSENT })),
        );

        if (result === null || !evaluates) {
          return;
        }

        expect(result.hits).toHaveLength(0);
      }));

    test("every declared facet comes back counted, or is refused", () =>
      withIndex(async (products) => {
        const fields = Object.keys(declaration.facetable);

        const result = await getResultUnlessRefused(
          products.search("").facets(...fields),
        );

        if (result === null) {
          return;
        }

        for (const field of fields) {
          const facet = result.facets[field];

          expect([true, false, "unknown"]).toContain(facet?.exhaustive);

          for (const bucket of facet?.values ?? []) {
            expect(Number.isInteger(bucket.count)).toBe(true);
            expect(bucket.count).toBeGreaterThanOrEqual(0);
          }

          if (evaluates) {
            expect(facet?.values.length).toBeGreaterThan(0);
          }
        }
      }));

    test("every declared highlight comes back as parts without markup, or is refused", () =>
      withIndex(async (products) => {
        const fields = declaration.highlightable;

        const result = await getResultUnlessRefused(
          products.search(fixtures.query).highlight(...fields),
        );

        if (result === null) {
          return;
        }

        for (const hit of result.hits) {
          for (const field of fields) {
            const original = getFieldValue(hit.document, field);

            for (const fragment of hit.highlights[field] ?? []) {
              expect(fragment.parts.length).toBeGreaterThan(0);

              // Rejoining the parts gives back exactly the field, which
              // catches a leaked marker and a corrupted slice at once, and
              // does not punish a document that legitimately holds markup. A
              // truncated fragment is a snippet, so it cannot be compared.
              if (
                fragment.truncated === false &&
                typeof original === "string"
              ) {
                expect(fragment.parts.map((part) => part.text).join("")).toBe(
                  original,
                );
              }
            }
          }
        }
      }));

    test("every declared sort orders the hits, or is refused", () =>
      withIndex(async (products) => {
        for (const [sortName, sort] of Object.entries(declaration.sorts)) {
          const result = await getResultUnlessRefused(
            products.search("").sort(sortName).page({ size: 10 }),
          );

          if (result === null || sort === null || !evaluates) {
            continue;
          }

          for (const [position, hit] of result.hits.entries()) {
            const next = result.hits[position + 1];

            if (next === undefined) {
              continue;
            }

            expect(isInOrder(sort.by, hit.document, next.document)).toBe(true);
          }
        }
      }));

    test("every declared profile answers, or is refused", () =>
      withIndex(async (products) => {
        for (const profile of Object.keys(declaration.profiles)) {
          await getResultUnlessRefused(
            products.search(fixtures.query).profile(profile),
          );
        }
      }));

    test("disposal, where there is one, completes", () => {
      const adapter = createAdapter();

      expect(() => adapter.dispose?.()).not.toThrow();
    });
  });
};
