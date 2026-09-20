# @priemskiyyy/scout-meilisearch

[Meilisearch](https://www.meilisearch.com/) adapter for
[Scout](../../core). Requires `meilisearch` 0.50 or newer.

Meilisearch answers a search two different ways depending on how you paginate,
and the two disagree about how sure they are. This adapter keeps them apart
instead of flattening both into one number, and it builds highlights from
markers it generates per search rather than from the UTF-8 byte offsets
Meilisearch reports, which are not valid JavaScript string indexes.

## Installation

```sh
pnpm add @priemskiyyy/scout @priemskiyyy/scout-meilisearch meilisearch
```

The index client is injected, so this package imports no SDK at runtime.
`src/meilisearch.contracts.ts` pins the structural types to the real ones.

## Create an index

```ts
import { index, Scout } from "@priemskiyyy/scout";
import { meilisearch } from "@priemskiyyy/scout-meilisearch";
import { Meilisearch } from "meilisearch";
import { type Product, ProductSchema } from "./ProductSchema";

const client = new Meilisearch({ host, apiKey });

const scout = new Scout({
  indexes: {
    products: index({
      schema: ProductSchema,
      id: (product: Product) => product.id,
      filterable: ["brand", "price", "tags"],
      facetable: ["brand"],
      highlightable: ["title"],
      sorts: ["relevance", "cheapest"],
      profiles: ["default", "titles"],
      adapter: meilisearch({
        index: client.index("products"),
        profiles: {
          default: {},
          titles: { attributesToSearchOn: ["title"] },
        },
        sorts: {
          relevance: {},
          cheapest: { sort: ["price:asc"] },
        },
      }),
    }),
  },
});
```

The adapter has to cover every sort and profile the index declares. Leaving one
out is a compile error here, not a surprise at a call site.

## Pagination and how sure a total is

Meilisearch paginates two ways and reports totals differently for each.

- `pagination: "page"`, the default, sends `page` and `hitsPerPage` and reads
  `totalHits` and `totalPages`. That count is exhaustive, so the total is
  `"exact"`, and `next` is known whenever the response carried `totalPages`. A
  response without it leaves `next` as `"unknown"` rather than guessing.
- `pagination: "offset"` sends `offset` and `limit` and reads
  `estimatedTotalHits`, which is an estimate. The total is `"estimated"`, and
  `next` is `"unknown"` for a full page because guessing from an estimate would
  invent a page that may not exist. A short page still reports `null`.

An index counts at most `pagination.maxTotalHits` documents, 1000 by default.
Tell the adapter what yours is set to:

```ts
meilisearch({ index, profiles, sorts, maxTotalHits: 5000 });
```

A page mode total that reaches that number is a cap rather than a count, so it
is reported as `"lower-bound"` with scope `"retrievable"`: that is how many
documents pagination can reach, not how many matched. Below the cap the scope is
`"matches"`.

## Filters

The portable filter AST becomes a Meilisearch filter expression: `field = value`,
`field != value`, `field > n`, `field IN [a, b]`, `field NOT IN [a, b]`,
`field min TO max`, and `AND`, `OR` and `NOT` over parenthesised groups. A null
comparison becomes `IS NULL` or `IS NOT NULL`, because Meilisearch has no null
literal and the string `"null"` would be a different question.

String values are double quoted with backslashes and quotes escaped, so a value
carrying a quote cannot end the clause and start another one. A value
Meilisearch cannot order, such as a `Date` or an object, is refused with
`UnsupportedSearchFeatureError` rather than stringified into something that
would filter on the wrong thing.

A filter that resolves to a contradiction, such as an empty `in([])`, is
answered here with an empty result and never sent, so the query costs nothing.

## Highlights

Highlights come back as `{ text, matched }` parts, never as markup.

Meilisearch can report match positions two ways. `_matchesPosition` gives
`start` and `length` as UTF-8 byte offsets, which are not JavaScript string
indexes: slicing a string by them corrupts any accented, CJK or emoji text. This
adapter does not ask for them. It sets `attributesToHighlight` with its own
`highlightPreTag` and `highlightPostTag` and splits the formatted value on those
markers, which is plain string slicing and cannot cut a character in half.

The markers carry a fresh random id per search, so a document carrying marker
shaped text cannot forge a highlight. A value whose markers do not pair up
degrades to a single unmatched part carrying the plain text.

## Facets

Requested facets are read from `facetDistribution`, and `facetStats` for the
field is kept on the facet's `native`. Meilisearch never says whether a
distribution was cut short by `maxValuesPerFacet`, so `exhaustive` is
`"unknown"` rather than a claim this adapter cannot back.

## Cancellation

The SDK's third argument is `Omit<RequestInit, "body" | "method">`, so the
signal survives and the HTTP request is really cancelled. The adapter declares
`cancellation: "transport"`.

## Provider options

A profile, or a `.provider()` call, may set the Meilisearch parameters Scout
does not own, such as `attributesToSearchOn`, `matchingStrategy`, `distinct` and
the cropping options. Scout owns `q`, `filter`, `sort`, `facets`, `page`,
`hitsPerPage`, `offset`, `limit`, `attributesToHighlight`, `highlightPreTag` and
`highlightPostTag`, which the adapter lists in `reservedOptions`, so setting one
of them alongside a portable call is refused instead of silently overwritten.

## What it does not do

- Multi search, federated search and `searchForFacetValues` are not exposed, so
  disjunctive facets are not available: `facets.excludeOwnFilter` and
  `facets.searchValues` are both `false`.
- Hybrid and vector search are outside the portable contract. Reach for the
  client directly when you need them.
- `fingerprint()` is the index uid. An API key never takes part in query
  identity, so it cannot reach a cache key or devtools.

## Facet value types

Set `facets: { price: "number", inStock: "boolean" }` for non-string facet
labels. This restores the types declared by your document schema. Unconfigured
fields keep their string labels; malformed configured values reject with
`SearchProviderError` instead of leaking the wrong type into a result.
