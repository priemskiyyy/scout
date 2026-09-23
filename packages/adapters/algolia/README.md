---
description: The Algolia adapter for Scout, with replica backed sorts, honest totals under paginationLimitedTo and highlight parts a document cannot forge.
---

# @priemskiyyy/scout-algolia

Algolia behind Scout's portable search contract. It translates one search onto
one Algolia index and maps the answer back, and it does nothing else. The
client is yours, so this package has no runtime dependencies and imports no
SDK.

```sh
pnpm add @priemskiyyy/scout @priemskiyyy/scout-algolia algoliasearch
```

## Use

```ts
import { index, Scout } from "@priemskiyyy/scout";
import { algolia } from "@priemskiyyy/scout-algolia";
import { algoliasearch } from "algoliasearch";

const products = index({
  schema: ProductSchema,
  id: (product) => product.objectID,
  searchable: ["title", "brand"],
  filterable: ["brand", "price", "inStock"],
  facetable: { brand: "string", price: "number" },
  highlightable: ["title"],
  sorts: { priceAsc: { price: "asc" } },
  profiles: { titles: { searchable: ["title"] } },
});

const scout = new Scout({
  indexes: { products },
  adapters: {
    products: algolia({
      client: algoliasearch(appId, searchOnlyApiKey),
      indexName: "products",
      replicas: { priceAsc: "products_price_asc" },
      profiles: { titles: { typoTolerance: false } },
    }),
  },
});
```

| Option                | What it is                                                                       |
| --------------------- | -------------------------------------------------------------------------------- |
| `client`              | The client the application owns. The adapter never disposes it.                  |
| `indexName`           | The primary index, which serves the relevance order.                             |
| `replicas`            | The replica index serving each of the index's sorts, keyed by sort name.         |
| `profiles`            | Algolia parameters each of the index's profiles adds, keyed by profile name.     |
| `cache`               | Whether the client's own request and response caches may answer. Off by default. |
| `paginationLimitedTo` | The index's `paginationLimitedTo` setting. 1000 unless it was changed.           |

## Sorting is a replica index

Algolia has no per search sort. Every order other than relevance is a separate
replica index, so each sort the index declares needs one under `replicas`.
Relevance searches `indexName`, and a sort searches its replica. The sort's
fields are not sent, because the replica's own ranking already orders by them.

A sort without a replica is a compile error where the `Scout` is built, and a
`configuration` error when it is built from JavaScript. The replica mapping is
part of `fingerprint()`, because the same sort over a different replica is a
different result set. The fingerprint never carries an API key.

## What it translates

- **Query and fields.** An empty query browses the whole index. The profile's
  fields become `restrictSearchableAttributes`, so they have to be among the
  index's own `searchableAttributes`.
- **Filters.** The filter becomes one `filters` string. String values are
  always quoted, with a backslash and a quote inside escaped, so a value that
  spells `acme OR bolt` stays data. An attribute name is left bare when it is
  a plain identifier and quoted when it is not. Numbers are compared with
  Algolia's numeric operators, and a range is `price:10 TO 100`, inclusive at
  both ends.
- **Pages.** Algolia pages are zero based, so Scout's page 1 is sent as page 0.
- **Profiles.** A profile's parameters are added to every search that names
  it, and `.provider()` options are added after them.
- **Time.** `processingTimeMS` is the engine's own `took`.

| Filter                          | String                                  |
| ------------------------------- | --------------------------------------- |
| `brand.eq("acme")`              | `brand:"acme"`                          |
| `inStock.eq(true)`              | `inStock:true`                          |
| `price.eq(79)`                  | `price = 79`                            |
| `brand.neq("acme")`             | `NOT brand:"acme"`                      |
| `price.neq(79)`                 | `price != 79`                           |
| `brand.in(["acme", "bolt"])`    | `(brand:"acme" OR brand:"bolt")`        |
| `brand.notIn(["acme", "bolt"])` | `NOT brand:"acme" AND NOT brand:"bolt"` |
| `price.gte(10)`                 | `price >= 10`                           |
| `price.between(10, 100)`        | `price:10 TO 100`                       |

## What it refuses

Each refusal is a `ScoutError`, and nothing is sent.

| Refused                                                                  | Code                  |
| ------------------------------------------------------------------------ | --------------------- |
| A page larger than 1000 hits                                             | `unsupported-feature` |
| An AND group inside an OR group                                          | `unsupported-feature` |
| An OR group mixing numeric, facet and tag filters                        | `unsupported-feature` |
| A set mixing numbers and facet values                                    | `unsupported-feature` |
| A negated group, range or comparison, since Algolia negates one equality | `unsupported-feature` |
| A sort with no replica                                                   | `configuration`       |
| A provider option or profile parameter Scout writes itself               | `configuration`       |

Scout writes `query`, `filters`, `numericFilters`, `facetFilters`,
`tagFilters`, `page`, `hitsPerPage`, `offset`, `length`, `facets`,
`restrictSearchableAttributes`, `attributesToHighlight`, `highlightPreTag` and
`highlightPostTag`. `offset` and `length` are among them because either one
silently overrides the page. They are the adapter's `reservedOptions`, so Scout
refuses a provider option that names one before the search reaches the
adapter, and the adapter refuses a profile that sets one when it is made. A filter's values need no check: each operator's value is typed, and Scout
refuses `NaN` and infinite numbers.

## Totals and facets

Accuracy follows `exhaustive.nbHits`: `true` is `"exact"`, `false` is
`"estimated"`, and a missing flag is `"unknown"`. Algolia approximates the
count once a query passes about 50ms or roughly 10,000 exact matches.

`paginationLimitedTo` is an index setting, not a response field, so the
adapter takes it as configuration. A count inside that window is
`scope: "retrievable"`. A count past it is `scope: "matches"`: those matches
exist, but pagination cannot reach them. The adapter tells Scout where paging
stops, so the pages end at the window while the total still counts every
match.

Facet values are passed on as the strings Algolia indexed, and Scout reads
each one as the type the index declared. A facet's exhaustiveness is
`exhaustive.facetValues`, or `"unknown"` when Algolia said nothing. A facet
Algolia did not return is reported unknown, never as an empty count.

## Highlights

Highlights come back as parts, never as markup. The adapter asks for a marker
made for each search instead of Algolia's default `<em>`, because Algolia
inserts the tags verbatim and escapes nothing, so a document indexed with a
fixed marker in it would forge a match. A title reading
`Lamp with <em>markup</em> inside` keeps its angle brackets as text in the
unmatched parts.

A marker that opens and never closes degrades to one unmatched part of plain
text. An array field gives one fragment per element, with its position in
`path`. `_highlightResult` carries the whole value, so no fragment is
truncated.

## Cancellation and caching

`@algolia/client-common` has no `AbortSignal` anywhere, so an aborted search
stops Scout waiting while Algolia still runs, and bills, the query. Debounce
search as you type if that matters to you.

`searchSingleIndex` marks every search cacheable, and the transporter gives a
request no way to opt out, so a cached answer would swallow a TanStack Query
invalidation. The adapter calls `searchSingleIndexWithHTTPInfo` instead, which
never consults the client's caches. Pass `cache: true` to let them answer.

`hit.native` keeps the whole Algolia hit, `_highlightResult` and `objectID`
among it, and `result.native` keeps the whole response. The document drops
Algolia's `_highlightResult`, `_snippetResult`, `_rankingInfo` and
`_distinctSeqID`.

## Tests

Algolia is hosted only, so the tests run against an in process fake of the
client in `src/algolia.fixture.ts`. `src/algolia.contracts.ts` pins that fake
and the adapter's structural types to the real `algoliasearch` 5.59.0 typings.
The fake answers the query, the page, `restrictSearchableAttributes`, facets
and highlights from a small corpus, and rejects a page over 1000 as Algolia
does. It does not interpret `filters` or a replica's order: only Algolia knows
what those mean, so the tests assert the exact string the adapter sends. Each
helper in `src/utils/` is tested on its own beside it, and
`src/algolia.test.ts` covers the adapter as a whole. The adapter has not run
against hosted Algolia.
