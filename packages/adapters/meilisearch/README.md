# @priemskiyyy/scout-meilisearch

The [Meilisearch](https://www.meilisearch.com/) adapter for
[Scout](https://priemskiyyy.github.io/scout/). It translates one portable
search request onto one Meilisearch index and maps the answer back, and it does
nothing else. Requires `meilisearch` 0.50 or newer.

```sh
pnpm add @priemskiyyy/scout@next @priemskiyyy/scout-meilisearch@next meilisearch
```

`meilisearch` is a peer dependency and the client is yours. This package
imports no SDK at runtime, so one build serves the browser, Node and React
Native. `src/meilisearch.contracts.ts` pins its structural types to the real
ones.

## Use

```ts
import { index, Scout } from "@priemskiyyy/scout";
import { meilisearch } from "@priemskiyyy/scout-meilisearch";
import { Meilisearch } from "meilisearch";

const client = new Meilisearch({ host, apiKey: searchKey });

const products = index({
  schema: ProductSchema,
  id: (product) => product.id,
  searchable: ["title", "brand"],
  filterable: ["brand", "price", "inStock"],
  facetable: { brand: "string", price: "number", inStock: "boolean" },
  highlightable: ["title"],
  sorts: { priceAsc: { price: "asc" } },
  profiles: { titles: { searchable: ["title"] } },
});

const scout = new Scout({
  indexes: { products },
  adapters: {
    products: meilisearch({
      index: client.index("products"),
      profiles: { titles: { matchingStrategy: "all" } },
    }),
  },
});
```

The index says what a search can do, and the adapter only says how Meilisearch
does it:

- `index` is the index client the application built. The adapter never closes
  it, and `scout.index("products").native` hands it back.
- `profiles` tunes the index's profiles, keyed by profile name, with any
  Meilisearch parameter Scout does not write, such as `matchingStrategy`,
  `rankingScoreThreshold`, `locales` or the cropping options. The fields a
  profile searches come from the index.
- `pagination` is `"page"`, the default, or `"offset"`. See below.
- `maxTotalHits` is the index's configured `pagination.maxTotalHits`, 1000 by
  default in Meilisearch.

A search may pass the same parameters per search through `.provider()`, and
they win over the profile's.

## What it translates

- **Query.** The query is the SDK's first argument, and an empty one is a
  placeholder search that browses the index. `attributesToSearchOn` is the
  profile's fields.
- **Filters.** The normalised filter becomes a Meilisearch filter expression:
  `field = value`, `field != value`, `field > n`, `field IN [a, b]`,
  `field NOT IN [a, b]`, `field min TO max`, and `AND`, `OR` and `NOT` with
  every member parenthesised. A null comparison becomes `IS NULL` or
  `IS NOT NULL`, because Meilisearch has no null literal. String values are
  double quoted with backslashes and quotes escaped, so a value cannot end its
  clause and start another.
- **Sorts.** A sort's fields become the `sort` array, such as
  `["price:asc", "title:desc"]`, and relevance sends none. Each field has to be
  sortable in the index settings.
- **Facets.** Requested facets are read from `facetDistribution`, and the
  field's `facetStats` is kept on the facet's `native`. Meilisearch reports
  every value as a string, and Scout reads it back as the type the index
  declared.
- **Highlights.** `attributesToHighlight` with a `highlightPreTag` and a
  `highlightPostTag` made for each search, and `_formatted` split into
  `{ text, matched }` parts. The adapter never reads `_matchesPosition`, whose
  offsets count UTF-8 bytes rather than JavaScript characters.
- **Time.** `processingTimeMs` is the engine's own `took`.
- **Cancellation.** The signal goes to the SDK's request options, so the HTTP
  request is cancelled.

The document is the hit without Meilisearch's own keys, such as `_formatted`
and `_rankingScore`. `hit.native` keeps the whole hit and `result.native` the
whole response.

## How sure a total is

- `pagination: "page"` sends `page` and `hitsPerPage` and reads `totalHits`,
  which Meilisearch counts exhaustively, so the total is `"exact"`. It counts
  up to `maxTotalHits` and stops, so a total that reaches the cap is a
  `"lower-bound"` with scope `"retrievable"`: how many documents paging can
  reach, not how many matched.
- `pagination: "offset"` sends `offset` and `limit` and reads
  `estimatedTotalHits`, so the total is `"estimated"` however small it is.
- A response with neither block has an `"unknown"` total.

A facet's `exhaustive` is `"unknown"`, because Meilisearch never says whether
`maxValuesPerFacet` cut a distribution short. A highlight fragment is
`truncated: false` unless the search crops, and `"unknown"` when it does,
because Meilisearch never says which values it cut.

## What it refuses

Each refusal rejects the search before anything is sent.

- A page larger than `maxTotalHits`, which is the most Meilisearch will fill,
  with the code `unsupported-feature`.
- A filter field that is not a plain attribute name, with the code
  `configuration`. A filter's values need no check here: each operator's value
  is typed, and Scout refuses `NaN` and infinite numbers.
- A provider option Scout writes from the search itself, with the code
  `configuration`: `q`, `attributesToSearchOn`, `filter`, `sort`, `facets`,
  `page`, `hitsPerPage`, `offset`, `limit`, `attributesToHighlight`,
  `highlightPreTag` and `highlightPostTag`. These are the adapter's
  `reservedOptions`, so Scout refuses them before the adapter sees the search.

Multi search, federated search, `searchForFacetValues`, and hybrid and vector
search are outside the portable contract. Reach for the client directly when
you need them.

`fingerprint()` is the index uid. An API key never takes part in query
identity, so it cannot reach a cache key or devtools.

## Tests

The adapter runs the shared conformance suite from `@priemskiyyy/scout/testing`
against an in-process fake of the index client. The fake evaluates the query,
the searched attributes, pagination, facets and highlights. It does not
evaluate filters or sorts, so their translation is pinned string by string in
`src/meilisearch.test.ts` instead. `src/meilisearch.contracts.ts` pins the fake
and the structural types to the real `meilisearch` 0.62.0 types.
`src/meilisearch.backend.test.ts` runs the same suite against a real
Meilisearch 1.54.0 server started from its official image, where filters,
sorts and pages are checked on the documents it returned. Run it with
`pnpm test:backends meilisearch`, which needs Docker.

MIT
