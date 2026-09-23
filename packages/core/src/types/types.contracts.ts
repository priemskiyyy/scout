import { createMockSearchAdapter } from "src/mock/createMockSearchAdapter";
import type { AnySearchAdapter } from "src/types/AnySearchAdapter";
import type { FilterExpression } from "src/types/FilterExpression";
import type { FilterOperator } from "src/types/FilterOperator";
import type { HighlightFragment } from "src/types/HighlightFragment";
import type { SearchAdapter } from "src/types/SearchAdapter";
import type { SearchFacet } from "src/types/SearchFacet";
import { index } from "src/utils/defineIndex";
import {
  ProductSchema,
  type Product,
} from "src/utils/internal/testSchema.fixture";
import { Scout } from "src/utils/Scout";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

// A broken assertion fails the constraint, so it is a compile error rather
// than a type nobody reads.
type Expect<TAssertion extends true> = TAssertion;

type Executed<TBuilder extends { execute: (...args: never[]) => unknown }> =
  Awaited<ReturnType<TBuilder["execute"]>>;

const products = index({
  schema: ProductSchema,
  id: (product) => product.id,
  searchable: ["name", "tags"],
  filterable: ["brand", "price", "inStock", "tags"],
  facetable: { brand: "string", price: "number", tags: "string" },
  highlightable: ["name"],
  sorts: { priceAsc: { price: "asc" } },
  profiles: { names: { searchable: ["name"] } },
});

/** An engine with options, hits and responses of its own. */
const engine: SearchAdapter<
  { client: true },
  { boost: number },
  { score: number },
  { took: number }
> = {
  name: "engine",
  native: { client: true },
  fingerprint: () => "engine",
  search: () => ({
    hits: [],
    total: { accuracy: "unknown", scope: "unknown" },
    facets: {},
    took: null,
    native: { took: 1 },
  }),
};

const scout = new Scout({
  indexes: { products },
  adapters: { products: engine },
});

const handle = scout.index("products");

// An adapter with options of its own is still an adapter.
const erased: AnySearchAdapter = engine;

// The document type survives the whole chain.
type DocumentSurvives = Expect<
  Equal<
    Executed<ReturnType<typeof handle.search>>["hits"][number]["document"],
    Product
  >
>;

// A requested facet is typed by its schema field, and an array field by its
// element type.
const faceted = handle.search("shoe").facets("brand", "price", "tags");

type BrandFacet = Expect<
  Equal<Executed<typeof faceted>["facets"]["brand"], SearchFacet<string>>
>;

type PriceFacet = Expect<
  Equal<Executed<typeof faceted>["facets"]["price"], SearchFacet<number>>
>;

type TagsFacet = Expect<
  Equal<Executed<typeof faceted>["facets"]["tags"], SearchFacet<string>>
>;

const unrequested = handle.search("shoe");

type NoFacetsRequested = Expect<
  Equal<Executed<typeof unrequested>["facets"], Record<never, never>>
>;

// A requested highlight is on every hit, and nothing else is.
const highlighted = handle.search("shoe").highlight("name");

type NameHighlight = Expect<
  Equal<
    Executed<typeof highlighted>["hits"][number]["highlights"],
    Readonly<Record<"name", readonly HighlightFragment[]>>
  >
>;

// The native types are the adapter's own.
type NativeClient = Expect<Equal<typeof handle.native, { client: true }>>;

type NativeHit = Expect<
  Equal<
    Executed<typeof unrequested>["hits"][number]["native"],
    { score: number }
  >
>;

type NativeResponse = Expect<
  Equal<Executed<typeof unrequested>["native"], { took: number } | null>
>;

handle.search("shoe").provider({ boost: 2 });
// @ts-expect-error provider options are the adapter's own
handle.search("shoe").provider({ boost: "high" });
// @ts-expect-error a sort the index never declared
handle.search("shoe").sort("nameAsc");
// @ts-expect-error a profile the index never declared
handle.search("shoe").profile("fuzzy");
// @ts-expect-error name was never declared filterable
handle.search("shoe").where((product) => product.name.eq("a"));
// @ts-expect-error a string field has no range operators
handle.search("shoe").where((product) => product.brand.between("a", "b"));
// @ts-expect-error a boolean field has no ordering
handle.search("shoe").where((product) => product.inStock.gt(true));
// @ts-expect-error an array of strings filters by its element type
handle.search("shoe").where((product) => product.tags.eq(1));
// @ts-expect-error inStock was never declared facetable
handle.search("shoe").facets("inStock");
// @ts-expect-error brand was never declared highlightable
handle.search("shoe").highlight("brand");
// @ts-expect-error an index that was never declared
scout.index("orders");

// A hand-built comparison carries the value its operator compares with, so an
// adapter never has to check it. Each directive sits on the offending
// property, which is where the error is reported.
const stringRange: FilterExpression = {
  type: "comparison",
  field: "brand",
  operator: "gt",
  // @ts-expect-error a range compares with a number
  value: "A",
};

const bareSet: FilterExpression = {
  type: "comparison",
  field: "brand",
  operator: "in",
  // @ts-expect-error a set compares with a list of values
  value: "Nike",
};

const oneBound: FilterExpression = {
  type: "comparison",
  field: "price",
  operator: "between",
  // @ts-expect-error between takes a lower and an upper bound
  value: [1],
};

const objectValue: FilterExpression = {
  type: "comparison",
  field: "brand",
  operator: "eq",
  // @ts-expect-error an equality compares with a string, a number or a boolean
  value: {},
};

// A page is moved or resized with an object that keeps what it leaves out.
handle.search("shoe").page({ size: 20 }).page({ current: 2 });
// @ts-expect-error page takes { current, size }, not a bare number
handle.search("shoe").page(2);

// A declaration says only what its schema allows.
index({
  schema: ProductSchema,
  id: (product) => product.id,
  // @ts-expect-error price is not text, so it cannot be searched
  searchable: ["price"],
});

index({
  schema: ProductSchema,
  id: (product) => product.id,
  searchable: ["name"],
  // @ts-expect-error brand holds strings, not numbers
  facetable: { brand: "number" },
});

index({
  schema: ProductSchema,
  id: (product) => product.id,
  searchable: ["name"],
  // @ts-expect-error colour is not a field of the document
  facetable: { colour: "string" },
});

index({
  schema: ProductSchema,
  id: (product) => product.id,
  searchable: ["name"],
  // @ts-expect-error relevance is built in
  sorts: { relevance: { price: "desc" } },
});

index({
  schema: ProductSchema,
  id: (product) => product.id,
  searchable: ["name"],
  // @ts-expect-error a sort orders by fields of the document
  sorts: { newest: { createdAt: "desc" } },
});

index({
  schema: ProductSchema,
  id: (product) => product.id,
  searchable: ["name"],
  // @ts-expect-error a direction is asc or desc
  sorts: { priceAsc: { price: "up" } },
});

index({
  schema: ProductSchema,
  id: (product) => product.id,
  searchable: ["name"],
  // @ts-expect-error default is built in
  profiles: { default: { searchable: ["name"] } },
});

// Every index has an adapter, and every adapter an index.
new Scout({
  indexes: { products },
  // @ts-expect-error the products index has no adapter
  adapters: {},
});

new Scout({
  indexes: { products },
  // @ts-expect-error orders serves no index
  adapters: { products: engine, orders: engine },
});

// An adapter that serves sorts through its own configuration covers them all.
new Scout({
  indexes: { products },
  adapters: {
    products: createMockSearchAdapter({ sorts: { priceAsc: "replica" } })
      .adapter,
  },
});

/** An engine that serves each sort from configuration of its own. */
const replicas = <const TSort extends string>(
  sorts: Readonly<Record<TSort, string>>,
): SearchAdapter<null> & {
  readonly sorts: Readonly<Record<TSort, string>>;
} => ({
  ...createMockSearchAdapter().adapter,
  native: null,
  sorts,
});

new Scout({
  indexes: { products },
  adapters: { products: replicas({ priceAsc: "products_price_asc" }) },
});

new Scout({
  indexes: { products },
  // @ts-expect-error the adapter's sorts have no priceAsc
  adapters: { products: replicas({ newest: "products_newest" }) },
});

// Omit and Pick are not distributive: over a union they keep only the shared
// keys, silently. Any transform over FilterExpression has to distribute.
type DistributiveOmit<TUnion, TKey extends PropertyKey> = TUnion extends unknown
  ? Omit<TUnion, TKey>
  : never;

type OmitFlattensAUnion = Expect<
  Equal<keyof Omit<FilterExpression, "never">, "type">
>;

type DistributiveOmitKeepsEachVariant = Expect<
  Equal<
    Extract<
      DistributiveOmit<FilterExpression, "never">,
      { type: "comparison" }
    >["operator"],
    FilterOperator
  >
>;

// Exported so the probes count as used; nothing imports this file.
export {
  bareSet,
  erased,
  faceted,
  highlighted,
  objectValue,
  oneBound,
  stringRange,
  unrequested,
};
export type {
  BrandFacet,
  DistributiveOmitKeepsEachVariant,
  DocumentSurvives,
  NameHighlight,
  NativeClient,
  NativeHit,
  NativeResponse,
  NoFacetsRequested,
  OmitFlattensAUnion,
  PriceFacet,
  TagsFacet,
};
