---
description: The Algolia adapter for Scout, with logical cancellation, replica backed sorts, honest totals under paginationLimitedTo and highlight parts a document cannot forge.
---

# @priemskiyyy/scout-algolia

Algolia behind Scout's portable search contract. The client is injected by the
application, so this package has no runtime dependencies and imports no SDK.

```sh
pnpm add @priemskiyyy/scout @priemskiyyy/scout-algolia algoliasearch
```

```ts
import { index, Scout } from "@priemskiyyy/scout";
import { algolia } from "@priemskiyyy/scout-algolia";
import { algoliasearch } from "algoliasearch";

const client = algoliasearch(appId, searchOnlyApiKey);

const products = index({
  schema: ProductSchema,
  id: (product) => product.objectID,
  filterable: ["brand", "price", "inStock"],
  facetable: ["brand"],
  highlightable: ["title"],
  sorts: ["relevance", "priceAsc"],
  profiles: ["default"],
  adapter: algolia({
    client,
    index: { name: "products" },
    sorts: {
      relevance: { index: { name: "products" } },
      priceAsc: { index: { name: "products_price_asc" } },
    },
    profiles: { default: {} },
  }),
});

const scout = new Scout({ indexes: { products } });
```

## Aborting a search does not cancel it

This adapter declares `cancellation: "logical"`. Version 5 of the Algolia
client has no `AbortSignal` support anywhere: `RequestOptions` is
`Pick<Request, "cacheable">` plus `timeouts`, `headers` and `queryParameters`,
and there is no signal to hand to the transporter. `src/algolia.contracts.ts`
pins that fact against the real typings.

Aborting therefore stops Scout waiting and refuses the late answer, which is
what `"logical"` means. Algolia keeps computing the query and still bills for
it. Debounce search as you type if that matters to you.

## The client's own caches are bypassed

`createTransporter` takes a `requestsCache` and a `responsesCache`, and
`searchSingleIndex` marks every search `cacheable: true`. The transporter reads
that as `requestOptions.cacheable || request.cacheable`, so a per request opt
out is impossible: a cached response would answer a TanStack Query
invalidation without ever reaching Algolia.

The adapter therefore calls `searchSingleIndexWithHTTPInfo`, which is the only
search call that never consults either cache, and reads `.data` from it. Pass
`cache: true` to use `searchSingleIndex` instead and let the client's caches
answer.

## Sorting is a replica index

Algolia has no per request sort parameter. Alternative orders are separate
replica indexes, so every Scout sort name maps to an index name:

```ts
sorts: {
  relevance: { index: { name: "products" } },
  priceAsc: { index: { name: "products_price_asc" } },
}
```

The replica mapping is part of `fingerprint()`, because the same sort name over
a different replica is a different result set. The fingerprint is the primary
index name followed by each mapping, and it never contains an API key.

## Pagination and totals

Algolia pages are zero based, so Scout page 1 is sent as Algolia page 0 and
comes back translated. `hitsPerPage` is capped at 1000, which the adapter
declares as `pagination.maxPageSize` so an oversized page is refused before
dispatch.

`paginationLimitedTo` is an index setting, not a response field, so the adapter
takes it as configuration and assumes Algolia's default of 1000:

```ts
algolia({
  client,
  index: { name: "products" },
  sorts,
  profiles,
  paginationLimitedTo: 5000,
});
```

Matches past that window exist but cannot be paged to. The adapter caps
`page.next` at the last reachable page and reports the total as
`scope: "matches"`, keeping `scope: "retrievable"` for a count that pagination
can actually walk.

Accuracy follows `exhaustive.nbHits`: `true` is `"exact"`, `false` is
`"estimated"`, and a missing flag is `"unknown"`. Algolia approximates the
count once a query passes about 50ms or roughly 10,000 exact matches. Facet
exhaustiveness comes from `exhaustive.facetValues` the same way.

## Filters

The normalised filter tree becomes one `filters` string. Numeric comparisons
are written inside that string with Algolia's own operators rather than sent as
`numericFilters`, so one parameter carries the whole expression and mixed
boolean composition stays in one place.

| Filter                          | String                                    |
| ------------------------------- | ----------------------------------------- |
| `brand.eq("acme")`              | `brand:"acme"`                            |
| `inStock.eq(true)`              | `inStock:true`                            |
| `price.eq(79)`                  | `price = 79`                              |
| `brand.neq("acme")`             | `NOT brand:"acme"`                        |
| `price.neq(79)`                 | `price != 79`                             |
| `brand.in(["acme", "bolt"])`    | `(brand:"acme" OR brand:"bolt")`          |
| `brand.notIn(["acme", "bolt"])` | `(NOT brand:"acme" AND NOT brand:"bolt")` |
| `price.gte(10)`                 | `price >= 10`                             |
| `price.between(10, 100)`        | `price:10 TO 100`                         |
| `and(a, b)`                     | `(a AND b)`                               |
| `not(a)`                        | `NOT (a)`                                 |

String values are always quoted, and a backslash or a quote inside one is
escaped, so a value that spells `acme OR bolt` or carries a `"` stays data
instead of becoming syntax. An attribute name is left bare when it is a plain
identifier and quoted the same way when it is not. A comparison or a range
against a non numeric value throws `UnsupportedSearchFeatureError` rather than
being sent and misread.

A filter that resolves to a false constant, such as an empty `in([])`, returns
an empty result without a request, because Algolia has no spelling for a
contradiction and asking would be a billed query. A constant sitting inside a
group is read the same way: it decides the group when it absorbs, as a false
constant does inside an `and`, and disappears when it is neutral. Dropping it
instead would answer a wider or a narrower search than the one that was asked
for.

Algolia's own documentation lists restrictions on combining filter kinds with
`OR` and on negating a group. This adapter emits fully parenthesised
expressions and relies on the current engine accepting them.

## Highlights

Highlights come back as `HighlightPart[]`, never as markup. The adapter sets
`highlightPreTag` and `highlightPostTag` to a random marker generated per
search instead of using Algolia's default `<em>`, because Algolia inserts the
tags verbatim and escapes nothing: a document indexed with `<em>` in it would
otherwise forge a match, and so would a document indexed with a fixed marker in
it. A marker chosen after the document was written cannot be forged by that
document.

Text that looks like markup is preserved as text. A title reading
`Lamp with <em>markup</em> inside` produces one matched part around the word
that actually matched and leaves the angle brackets in the unmatched parts,
where they are data for the application to render as text.

An opening marker with no closing one is malformed metadata and degrades to a
single unmatched part carrying the plain value. A nested or repeated attribute
reports where it sits, so an array field gives one fragment per element with
its index in `path`.

## Provider options

`.provider()` reaches Algolia's own search parameters. These keys are reserved,
because they would overwrite something Scout already decided and make the
answer stop matching the request:

`filters`, `query`, `page`, `hitsPerPage`, `facets`, `attributesToHighlight`,
`highlightPreTag`, `highlightPostTag`, `numericFilters`, `facetFilters`,
`tagFilters`, `offset`, `length`.

A profile carries the same kind of parameters for every search that names it:

```ts
profiles: { default: {}, strict: { searchParams: { typoTolerance: false } } }
```

## What is verified

Algolia is hosted only, so this adapter is tested against an in process fake of
the client shape in `src/algolia.fixture.ts`, with `src/algolia.contracts.ts`
pinning that fake and the adapter's structural types to the real
`algoliasearch` 5.59.0 typings. The fake does not interpret the `filters`
string; the tests assert the exact string the adapter sends, because only
Algolia knows what it means. Delivery against hosted Algolia is untested.

## Boolean filters and profiles

Scout follows [Algolia's boolean grammar](https://www.algolia.com/doc/guides/managing-results/refine-results/filtering/in-depth/combining-boolean-operators).
AND clauses may contain OR groups. AND inside OR, negated groups or ranges,
and OR groups mixing numeric, facet and tag filters throw before dispatch.
Profiles cannot set Scout-owned parameters such as filters or pagination.

## Facet value types

Set `facets: { price: "number", inStock: "boolean" }` for non-string facet
labels. This restores the types declared by your document schema. Unconfigured
fields keep their string labels; malformed configured values reject with
`SearchProviderError` instead of leaking the wrong type into a result.
