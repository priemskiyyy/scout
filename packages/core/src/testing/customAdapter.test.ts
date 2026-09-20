import { expect, test } from "vitest";
// Keep adapter construction on public exports to catch gaps in the authoring API.
import {
  assertUnreachable,
  createSearchAdapter,
  emptySearchResponse,
  index,
  Scout,
  UnsupportedSearchFeatureError,
  type FilterExpression,
  type SearchCapabilities,
} from "src/index";
import { testSearchAdapter } from "src/testing/testSearchAdapter";
import {
  ProductSchema,
  product,
  type Product,
} from "src/utils/internal/testSchema.fixture";

/** The wire shape of some backend an application already owns. */
type Payload = {
  q: string;
  where: string;
  from: number;
  size: number;
  facet: readonly string[];
};

type Body = {
  rows: readonly { doc: Product; marked?: Record<string, string> }[];
  matched: number;
  approximate: boolean;
  buckets?: Record<string, Record<string, number>>;
};

const CAPABILITIES: SearchCapabilities = {
  filters: {
    eq: true,
    neq: true,
    in: false,
    notIn: false,
    comparison: true,
    between: false,
    booleanComposition: true,
  },
  pagination: { maxPageSize: 100 },
  facets: { resultScoped: true },
  highlights: "none",
  cancellation: "transport",
};

const toWhere = (filter: FilterExpression): string => {
  if (filter.type === "constant") {
    return filter.value ? "" : "false";
  }
  if (filter.type === "comparison") {
    return `${filter.field} ${filter.operator} ${JSON.stringify(filter.value)}`;
  }
  if (filter.type === "not") {
    return `not(${toWhere(filter.expression)})`;
  }
  if (filter.type === "and" || filter.type === "or") {
    const joined = filter.expressions
      .map(toWhere)
      .join(filter.type === "and" ? " and " : " or ");
    return `(${joined})`;
  }
  return assertUnreachable(filter);
};

const jsonSearch = (options: {
  endpoint: string;
  send: (url: string, body: Payload, signal: AbortSignal) => Promise<Body>;
  /** The largest page this backend accepts, the way a real one caps it. */
  maxPageSize?: number;
}) => {
  const maxPageSize = options.maxPageSize ?? 100;
  return createSearchAdapter({
    name: "json",
    native: options.send,
    capabilities: { ...CAPABILITIES, pagination: { maxPageSize } },
    sorts: { relevance: null, priceAsc: null },
    profiles: { default: null },
    reservedOptions: ["q", "where", "from", "size"],
    fingerprint: () => options.endpoint,
    search: async (request, { signal }) => {
      if (request.page.size > maxPageSize) {
        // A real engine refuses the request rather than quietly trimming it.
        throw new UnsupportedSearchFeatureError({
          adapter: "json",
          feature: "pagination.maxPageSize",
          message: `The json backend accepts at most ${maxPageSize} results per page.`,
        });
      }
      const where = toWhere(request.filter);
      if (where === "false") {
        return emptySearchResponse(request);
      }
      const body = await options.send(
        options.endpoint,
        {
          q: request.query,
          where,
          from: (request.page.current - 1) * request.page.size,
          size: request.page.size,
          facet: request.facets,
        },
        signal,
      );
      const seen = request.page.current * request.page.size;
      return {
        hits: body.rows.map((row) => ({
          document: row.doc,
          highlights: {},
          native: row,
        })),
        page: {
          kind: "page",
          current: request.page.current,
          size: request.page.size,
          next: seen < body.matched ? request.page.current + 1 : null,
          previous: request.page.current > 1 ? request.page.current - 1 : null,
        },
        total: {
          value: body.matched,
          accuracy: body.approximate ? "estimated" : "exact",
          scope: "matches",
        },
        facets: Object.fromEntries(
          request.facets.map((field) => [
            field,
            {
              field,
              values: Object.entries(body.buckets?.[field] ?? {}).map(
                ([value, count]) => ({ value, count }),
              ),
              exhaustive: "unknown" as const,
              native: body.buckets?.[field] ?? null,
            },
          ]),
        ),
        took: null,
        native: body,
      };
    },
    dispose: () => undefined,
  });
};

const CORPUS = [
  product({ id: "a", brand: "Nike", price: 120 }),
  product({ id: "b", brand: "Bose", price: 260 }),
  product({ id: "c", brand: "Sony", price: 90 }),
];

const backend = async (
  _url: string,
  body: Payload,
  signal: AbortSignal,
): Promise<Body> => {
  if (signal.aborted) {
    throw new Error("aborted");
  }
  const rows = CORPUS.slice(body.from, body.from + body.size).map((doc) => ({
    doc,
  }));
  return {
    rows,
    matched: CORPUS.length,
    approximate: false,
    buckets: body.facet.includes("brand")
      ? { brand: { Nike: 1, Bose: 1, Sony: 1 } }
      : {},
  };
};

const adapter = () =>
  jsonSearch({ endpoint: "https://api.test/search", send: backend });

const FIXTURES = {
  index: "products",
  query: "shoe",
  sort: "relevance",
  profile: "default",
  equality: { field: "brand", value: "Nike" },
  range: { field: "price", min: 50, max: 300 },
  facet: "brand",
};

testSearchAdapter({
  name: "a hand written json",
  createAdapter: adapter,
  fixtures: FIXTURES,
});

// Conformance requests must respect the adapter's page-size limit.
testSearchAdapter({
  name: "a hand written json that caps its pages",
  createAdapter: () =>
    jsonSearch({
      endpoint: "https://api.test/search",
      send: backend,
      maxPageSize: 1,
    }),
  fixtures: FIXTURES,
});

test("a hand written adapter works through Scout like any other", async () => {
  const products = index({
    schema: ProductSchema,
    id: (item) => item.id,
    filterable: ["brand", "price"],
    facetable: ["brand"],
    highlightable: [],
    sorts: ["relevance", "priceAsc"],
    profiles: ["default"],
    adapter: adapter(),
  });
  const scout = new Scout({ indexes: { products } });

  const result = await scout
    .index("products")
    .search("shoe")
    .where((item) => item.price.lte(300))
    .facets("brand")
    .pageSize(2)
    .execute();

  expect(result.hits.map((hit) => hit.id)).toEqual(["a", "b"]);
  expect(result.total).toEqual({
    value: 3,
    accuracy: "exact",
    scope: "matches",
  });
  expect(result.page.next).toBe(2);
  expect(result.facets.brand.values).toHaveLength(3);
});

test("a capability it declared false is refused before the backend is reached", async () => {
  const products = index({
    schema: ProductSchema,
    id: (item) => item.id,
    filterable: ["brand"],
    facetable: [],
    highlightable: [],
    sorts: ["relevance"],
    profiles: ["default"],
    adapter: adapter(),
  });
  const scout = new Scout({ indexes: { products } });

  await expect(
    scout
      .index("products")
      .search("shoe")
      .where((item) => item.brand.in(["Nike"]))
      .execute(),
  ).rejects.toThrowError(/cannot translate the in filter/);
});
