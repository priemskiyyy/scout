import { createSearchAdapter } from "src/generators/createSearchAdapter";
import { createMockSearchAdapter } from "src/mock/createMockSearchAdapter";
import { FULL_CAPABILITIES } from "src/utils/constants/defaultCapabilities";
import type { FilterExpression } from "src/types/FilterExpression";
import type { FilterOperator } from "src/types/FilterOperator";
import type { SearchFacet } from "src/types/SearchFacet";
import type { HighlightFragment } from "src/types/HighlightFragment";
import { Scout } from "src/utils/Scout";
import { index } from "src/utils/defineIndex";
import {
  ProductSchema,
  type Product,
} from "src/utils/internal/testSchema.fixture";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
// A broken assertion fails to satisfy the constraint, so it is a compile error
// rather than a type nobody reads.
type Expect<TAssertion extends true> = TAssertion;

const { adapter } = createMockSearchAdapter({
  sorts: { relevance: null, priceAsc: null },
  profiles: { default: null, autocomplete: null },
});

const products = index({
  schema: ProductSchema,
  id: (product) => product.id,
  filterable: ["brand", "price", "inStock", "tags"],
  facetable: ["brand", "price"],
  highlightable: ["name"],
  sorts: ["relevance", "priceAsc"],
  profiles: ["default", "autocomplete"],
  adapter,
});

const scout = new Scout({ indexes: { products } });
const handle = scout.index("products");

// @ts-expect-error An index declaration keeps the adapter it was created with.
products.adapter = adapter;
// @ts-expect-error An index declaration's handle factory is immutable.
products.create = () => handle;

// The document type survives the whole chain.
type Executed<TBuilder extends { execute: (...args: never[]) => unknown }> =
  Awaited<ReturnType<TBuilder["execute"]>>;
type DocumentSurvives = Expect<
  Equal<
    Executed<ReturnType<typeof handle.search>>["hits"][number]["document"],
    Product
  >
>;

// A requested facet is typed by its schema field; an array field reports its
// element type.
const faceted = handle.search("shoe").facets("brand", "price");
type BrandFacet = Expect<
  Equal<Executed<typeof faceted>["facets"]["brand"], SearchFacet<string>>
>;
type PriceFacet = Expect<
  Equal<Executed<typeof faceted>["facets"]["price"], SearchFacet<number>>
>;

// A requested highlight is present on every hit, and nothing else is.
const highlighted = handle.search("shoe").highlight("name");
type NameHighlight = Expect<
  Equal<
    Executed<typeof highlighted>["hits"][number]["highlights"],
    Readonly<Record<"name", readonly HighlightFragment[]>>
  >
>;

// The native handle keeps the adapter's own type.
type NativeHandle = Expect<
  Equal<
    typeof handle.native,
    { requests: (typeof adapter)["native"]["requests"] }
  >
>;

// @ts-expect-error a sort the index never declared
handle.search("shoe").sort("nameAsc");
// @ts-expect-error a profile the index never declared
handle.search("shoe").profile("fuzzy");
// @ts-expect-error `name` was never declared filterable
handle.search("shoe").where((product) => product.name.eq("a"));
// @ts-expect-error a string field has no range operators
handle.search("shoe").where((product) => product.brand.between("a", "b"));
// @ts-expect-error a boolean field has no ordering
handle.search("shoe").where((product) => product.inStock.gt(true));
// @ts-expect-error an array of strings filters by its element type
handle.search("shoe").where((product) => product.tags.eq(1));
// @ts-expect-error `name` was never declared facetable
handle.search("shoe").facets("name");
// @ts-expect-error `brand` was never declared highlightable
handle.search("shoe").highlight("brand");
// @ts-expect-error an index that was never declared
scout.index("orders");

const unrequested = handle.search("shoe");
type NoFacetsRequested = Expect<
  Equal<Executed<typeof unrequested>["facets"], Record<never, never>>
>;

// A custom mapping must preserve coverage without relying on the mock.
// This is an adapter built the way a real one is, from
// `createSearchAdapter` with no explicit type arguments, which is what keeps the
// literal keys of `sorts` and `profiles`. A `Readonly<Record<string, unknown>>`
// satisfies a record of any literal keys, so if those names were erased here
// every provider would look like it supported every sort.
const stubAdapter = <const TSort extends string>(sorts: Record<TSort, null>) =>
  createSearchAdapter({
    name: "stub",
    native: null,
    capabilities: FULL_CAPABILITIES,
    sorts,
    profiles: { default: null },
    reservedOptions: [],
    fingerprint: () => "stub",
    search: () =>
      Promise.resolve({
        hits: [],
        page: {
          kind: "page" as const,
          current: 1,
          size: 20,
          next: null,
          previous: null,
        },
        total: { accuracy: "unknown" as const, scope: "unknown" as const },
        facets: {},
        took: null,
        native: null,
      }),
    dispose: () => undefined,
  });

const covering = stubAdapter({ relevance: null, priceAsc: null });
// The wrapper requires a request and signal even when the mapping ignores them.
covering.search(
  {
    index: "products",
    query: "shoe",
    profile: "default",
    sort: "relevance",
    filter: { type: "constant", value: true },
    facets: [],
    highlights: [],
    page: { current: 1, size: 20 },
    provider: null,
  },
  { signal: new AbortController().signal },
);
// @ts-expect-error The wrapper reads its context even if the mapping does not.
covering.search();
index({
  schema: ProductSchema,
  id: (product) => product.id,
  filterable: ["brand"],
  facetable: [],
  highlightable: [],
  sorts: ["relevance", "priceAsc"],
  profiles: ["default"],
  adapter: covering,
});

const notCovering = stubAdapter({ relevance: null });
index({
  schema: ProductSchema,
  id: (product) => product.id,
  filterable: ["brand"],
  facetable: [],
  highlightable: [],
  sorts: ["relevance", "priceAsc"],
  profiles: ["default"],
  // @ts-expect-error the stub adapter declares no priceAsc sort, decision D2
  adapter: notCovering,
});

const { adapter: missingSort } = createMockSearchAdapter({
  sorts: { relevance: null },
  profiles: { default: null },
});
index({
  schema: ProductSchema,
  id: (product) => product.id,
  filterable: ["brand"],
  facetable: [],
  highlightable: [],
  // The directive sits on the line the error is reported on, which for an
  // object literal is the offending property and not the call.
  // @ts-expect-error the adapter does not cover every declared sort, decision D2
  sorts: ["relevance", "priceAsc"],
  profiles: ["default"],
  adapter: missingSort,
});

// `Omit` and `Pick` are not distributive: applied to a union they collapse it to
// the intersection of its keys, silently. `FilterExpression` is a five member
// union, so any transform over it has to distribute explicitly. Nothing in the
// core does this today; this is the guard against the next one that tries.
type DistributiveOmit<TUnion, TKey extends PropertyKey> = TUnion extends unknown
  ? Omit<TUnion, TKey>
  : never;

// The built in form flattens: every variant loses its own members and only the
// shared discriminant survives, so `type` is all that is left.
type Flattened = keyof Omit<FilterExpression, "never">;
type OmitFlattensAUnion = Expect<Equal<Flattened, "type">>;

// The distributive form keeps each variant, so the comparison arm still has the
// members that make it a comparison.
type Distributed = DistributiveOmit<FilterExpression, "never">;
type DistributiveOmitKeepsEachVariant = Expect<
  Equal<
    Extract<Distributed, { type: "comparison" }>["operator"],
    FilterOperator
  >
>;

// Exported so the probes count as used; nothing imports this file.
export { faceted, highlighted, unrequested };
export type {
  BrandFacet,
  DistributiveOmitKeepsEachVariant,
  OmitFlattensAUnion,
  DocumentSurvives,
  NameHighlight,
  NativeHandle,
  NoFacetsRequested,
  PriceFacet,
};
