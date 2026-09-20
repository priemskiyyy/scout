import {
  InfiniteQueryObserver,
  QueryClient,
  QueryObserver,
} from "@tanstack/query-core";
import { expectTypeOf } from "vitest";
import type { HighlightFragment } from "@priemskiyyy/scout";
import { flattenHits } from "src/flattenHits";
import { infiniteQueryOptions } from "src/infiniteQueryOptions";
import { products } from "src/products.fixture";
import { queryOptions } from "src/queryOptions";
import type { Product } from "src/products.fixture";

// What this file pins: the index's own types survive the whole round trip
// through TanStack Query, so a consumer reads `document`, `facets.brand` and
// `highlights.name` without knowing Scout was involved. It is checked by `tsc`,
// not run, and it fails the build when a negative case stops being an error.

const client = new QueryClient();
const { search } = products();
const faceted = search.facets("brand").highlight("name");

const one = await client.query(queryOptions(faceted));

expectTypeOf<(typeof one.hits)[number]["document"]>().toEqualTypeOf<Product>();
expectTypeOf<
  (typeof one.facets)["brand"]["values"][number]["value"]
>().toEqualTypeOf<string>();
expectTypeOf<(typeof one.hits)[number]["highlights"]["name"]>().toEqualTypeOf<
  readonly HighlightFragment[]
>();
expectTypeOf(one.page.next).toEqualTypeOf<number | null | "unknown">();

// The same options reach every entry point that takes them, unwrapped.
expectTypeOf(
  client.ensureQueryData(queryOptions(faceted)),
).resolves.toEqualTypeOf<typeof one>();
expectTypeOf(client.prefetchQuery(queryOptions(faceted))).resolves.toBeVoid();

const all = await client.infiniteQuery(infiniteQueryOptions(faceted));

expectTypeOf(all.pageParams).toEqualTypeOf<number[]>();
expectTypeOf<
  (typeof all.pages)[number]["facets"]["brand"]["values"][number]["value"]
>().toEqualTypeOf<string>();

const hits = flattenHits(all);

expectTypeOf(hits[0]?.document).toEqualTypeOf<Product | undefined>();
expectTypeOf(hits[0]?.highlights.name).toEqualTypeOf<
  readonly HighlightFragment[] | undefined
>();

// `useQuery` and `useInfiniteQuery` are these observers plus a subscription, so
// what an observer accepts is what the hooks accept, without pulling a
// framework binding in here. An observer's `data` is also the real shape
// `flattenHits` is handed: undefined until the first page answers.
const observed = new QueryObserver(
  client,
  queryOptions(faceted),
).getCurrentResult();
const observedPages = new InfiniteQueryObserver(
  client,
  infiniteQueryOptions(faceted),
).getCurrentResult();

expectTypeOf(observed.data?.hits[0]?.document).toEqualTypeOf<
  Product | undefined
>();
expectTypeOf(flattenHits(observedPages.data)[0]?.document).toEqualTypeOf<
  Product | undefined
>();

// @ts-expect-error a facet the search never requested is not on the result type
expectTypeOf(one.facets.price);

// @ts-expect-error the document type is the index's, so an unknown field is a compile error
expectTypeOf(one.hits[0]?.document.colour);

// @ts-expect-error a highlight the search never requested is not on a hit
expectTypeOf(one.hits[0]?.highlights.brand);

// @ts-expect-error flattenHits takes an infinite query's pages, not one page
flattenHits(one);

infiniteQueryOptions(faceted).queryFn({
  // @ts-expect-error the page parameter is a page number, not a string
  pageParam: "2",
  signal: new AbortController().signal,
});
