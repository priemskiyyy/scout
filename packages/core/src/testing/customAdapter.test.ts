import { expect, test } from "vitest";

// The adapter is written on public exports only, which catches a gap in the
// authoring API before an adapter author does.
import {
  createHighlightMarkers,
  matchesFilter,
  splitHighlight,
} from "src/adapter";
import {
  index,
  Scout,
  ScoutError,
  type AdapterFacet,
  type AdapterSort,
  type HighlightFragment,
  type SearchAdapter,
} from "src/index";
import { testSearchAdapter } from "src/testing/testSearchAdapter";
import { ProductSchema, product } from "src/utils/internal/testSchema.fixture";

const MAX_PAGE_SIZE = 100;

const getFieldValue = (document: object, field: string): unknown =>
  Object.getOwnPropertyDescriptor(document, field)?.value;

const getTexts = (document: object, field: string): readonly string[] => {
  const value = getFieldValue(document, field);

  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === "string");
  }

  return [];
};

const isQueryMatch = (
  document: object,
  searchable: readonly string[],
  words: readonly string[],
) =>
  words.every((word) =>
    searchable.some((field) =>
      getTexts(document, field).some((text) =>
        text.toLowerCase().includes(word),
      ),
    ),
  );

const compareValues = (left: unknown, right: unknown) => {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right));
};

const getSorted = (
  documents: readonly object[],
  sort: AdapterSort | null,
): readonly object[] => {
  if (sort === null) {
    return documents;
  }

  return [...documents].sort((left, right) => {
    for (const { field, direction } of sort.by) {
      const order = compareValues(
        getFieldValue(left, field),
        getFieldValue(right, field),
      );

      if (order === 0) {
        continue;
      }

      if (direction === "asc") {
        return order;
      }

      return -order;
    }

    return 0;
  });
};

const getFacet = (
  documents: readonly object[],
  field: string,
): AdapterFacet => {
  const counts = new Map<unknown, number>();

  for (const document of documents) {
    const value = getFieldValue(document, field);

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return {
    values: [...counts].map(([value, count]) => ({ value, count })),
    exhaustive: true,
    native: null,
  };
};

// Marks every occurrence the way a remote engine would, then splits it back
// into parts with markers made for this search, which is what an adapter over
// a marking engine does.
const getHighlights = (
  document: object,
  fields: readonly string[],
  words: readonly string[],
): Record<string, readonly HighlightFragment[]> => {
  const markers = createHighlightMarkers();

  const pattern = new RegExp(
    words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
    "gi",
  );

  const highlights: Record<string, readonly HighlightFragment[]> = {};

  for (const field of fields) {
    const value = getFieldValue(document, field);

    if (typeof value !== "string" || words.length === 0) {
      continue;
    }

    const marked = value.replace(
      pattern,
      (match) => `${markers.open}${match}${markers.close}`,
    );

    highlights[field] = [
      {
        path: [field],
        parts: splitHighlight(marked, markers),
        truncated: false,
      },
    ];
  }

  return highlights;
};

/** A whole engine over an array, written the way an application would. */
const arrayEngine = (
  documents: readonly object[],
): SearchAdapter<readonly object[], never, { position: number }> => ({
  name: "array",
  native: documents,
  fingerprint: () => `array:${documents.length}`,
  search: (request) => {
    if (request.page.size > MAX_PAGE_SIZE) {
      throw new ScoutError({
        code: "unsupported-feature",
        message: `The array engine returns at most ${MAX_PAGE_SIZE} documents a page.`,
      });
    }

    const words = request.query.toLowerCase().split(/\s+/).filter(Boolean);

    const matches = documents.filter(
      (document) =>
        matchesFilter(request.filter, document) &&
        isQueryMatch(document, request.searchable, words),
    );

    const start = (request.page.current - 1) * request.page.size;

    const page = getSorted(matches, request.sort).slice(
      start,
      start + request.page.size,
    );

    return {
      hits: page.map((document, position) => ({
        document,
        highlights: getHighlights(document, request.highlights, words),
        native: { position: start + position },
      })),
      total: { value: matches.length, accuracy: "exact", scope: "matches" },
      facets: Object.fromEntries(
        request.facets.map((field) => [field, getFacet(matches, field)]),
      ),
      took: null,
      native: { matched: matches.length },
    };
  },
});

const products = index({
  schema: ProductSchema,
  id: (item) => item.id,
  searchable: ["name", "brand"],
  filterable: ["brand", "price", "inStock"],
  facetable: { brand: "string", price: "number", inStock: "boolean" },
  highlightable: ["name"],
  sorts: {
    priceAsc: { price: "asc" },
    cheapestNamed: { price: "asc", name: "asc" },
  },
  profiles: { names: { searchable: ["name"] } },
});

const CORPUS = [
  product({ id: "a", name: "Running shoe", brand: "Nike", price: 120 }),
  product({
    id: "b",
    name: "Trail shoe",
    brand: "Salomon",
    price: 150,
    inStock: false,
  }),
  product({ id: "c", name: "Walking boot", brand: "Nike", price: 90 }),
  product({ id: "d", name: "Headphones", brand: "Sony", price: 260 }),
];

testSearchAdapter({
  name: "a hand written array",
  index: products,
  createAdapter: () => arrayEngine(CORPUS),
  evaluates: true,
  fixtures: {
    query: "shoe",
    equality: { field: "brand", value: "Nike" },
    range: { field: "price", min: 100, max: 200 },
  },
});

test("a hand written adapter works through Scout like any other", async () => {
  const scout = new Scout({
    indexes: { products },
    adapters: { products: arrayEngine(CORPUS) },
  });

  const result = await scout
    .index("products")
    .search("")
    .where((item) => item.price.lte(200))
    .sort("priceAsc")
    .facets("brand")
    .page({ size: 2 })
    .execute();

  expect(result.hits.map((hit) => hit.id)).toEqual(["c", "a"]);
  expect(result.total).toEqual({
    value: 3,
    accuracy: "exact",
    scope: "matches",
  });
  expect(result.page.next).toBe(2);
  expect(result.facets.brand.values).toEqual([
    { value: "Nike", count: 2 },
    { value: "Salomon", count: 1 },
  ]);
});

test("what the engine cannot serve is refused, and the refusal reaches the caller", async () => {
  const scout = new Scout({
    indexes: { products },
    adapters: { products: arrayEngine(CORPUS) },
  });

  await expect(
    scout.index("products").search("shoe").page({ size: 101 }).execute(),
  ).rejects.toMatchObject({
    code: "unsupported-feature",
    message: "The array engine returns at most 100 documents a page.",
  });
});
