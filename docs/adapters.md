---
description: "Compare the Scout adapters across filters, facets, highlights, page limits and cancellation, and see how each engine is configured and what it refuses."
---

# Adapters

An adapter maps one engine onto the portable contract and nothing more. It owns
translation, escaping, page numbering, accuracy mapping, facet coercion and
highlight construction. It owns no cache, no retries and no page accumulation.

```ts
// The index declaration does not change. The adapter configuration does.
adapter: typesense({ client, collection: "products", profiles, sorts });
adapter: algolia({ client, index: { name: "products" }, profiles, sorts });
adapter: meilisearch({ index: client.index("products"), profiles, sorts });
```

Each adapter declares what it actually implements, not what the vendor
advertises. A portable request a capability denies throws
`UnsupportedSearchFeatureError` before anything is sent. It is never dropped and
never emulated over the one page that came back, because a silently narrower
search returns results that look right and are not.

## Capabilities by adapter

Every value below comes from the adapter's own `capabilities` object and its
source, not from vendor documentation.

| Adapter     | Filters                              | Boolean composition                            | Facets                   | Highlights                  | Max page size                | Cancellation |
| ----------- | ------------------------------------ | ---------------------------------------------- | ------------------------ | --------------------------- | ---------------------------- | ------------ |
| Typesense   | All nine                             | Yes                                            | Result scoped            | Parts                       | 250                          | Transport    |
| Algolia     | All nine                             | AND clauses with OR groups; restrictions below | Result scoped            | Parts                       | 1000                         | Logical      |
| Meilisearch | All nine                             | Yes                                            | Result scoped            | Parts                       | `maxTotalHits`, default 1000 | Transport    |
| Orama       | All nine on supported property kinds | Yes                                            | Supported property kinds | None                        | None                         | Logical      |
| MiniSearch  | All nine                             | Yes                                            | None                     | None                        | None                         | Logical      |
| Fuse.js     | All nine                             | Yes                                            | None                     | Parts with `includeMatches` | None                         | Logical      |
| HTTP        | Declared by your backend             | Declared by your backend                       | Declared by your backend | Your mapping                | Declared by your backend     | Transport    |

Typesense, Algolia and Meilisearch use remote engines. Orama, MiniSearch and
Fuse.js run in process. HTTP wraps your own endpoint. Each adapter exposes the
injected engine through `native`.

`transport` cancellation means the provider request itself is cancelled.
`logical` means aborting stops Scout waiting and refuses the late answer while
the engine may still be computing and, on a hosted engine, still billing. All
nine filter operators are `eq`, `neq`, `in`, `notIn`, `gt`, `gte`, `lt`, `lte`
and `between`.

No adapter declares `facets.excludeOwnFilter` or `facets.searchValues`, because
none of them uses a multi-search endpoint. [Facets](facets.md) explains what
that means for a facet count.

## Typesense

```sh
pnpm add @priemskiyyy/scout-typesense typesense
```

```ts
adapter: typesense({
  client,
  collection: "products",
  profiles: { default: { queryBy: ["name", "brand"], prefix: true } },
  sorts: { relevance: {}, priceAsc: { sortBy: "price:asc" } },
  facets: { price: "number", inStock: "boolean" },
});
```

The filter tree becomes one `filter_by` string. Equality is exact `:=` and never
the token matching `:`, so a filter on `red` cannot also return `dark red`.
String values are backtick quoted with a backtick or a backslash inside escaped,
groups are parenthesised, and a negation is pushed down to the fields because
Typesense negates a field and never a group.

Pages are one-based like Scout's, so nothing is shifted, and `per_page` is
capped at 250. `found` is exact, or `estimated` when `search_cutoff` says the
engine stopped counting early, in which case the next page cannot be ruled out
and `page.next` is `"unknown"`. `facet_counts[].sampled` becomes the facet's
exhaustiveness. `search_time_ms` is reported as the engine's own `took`.

`facets` is how a facet value gets its type: Typesense reports every facet value
as a string, even for a numeric field, and only you know what the field really
is. A field left out stays the string Typesense sent.

It refuses a grouped search, because `group_by` answers with `grouped_hits`
instead of `hits` and that is a different result shape than this contract maps.
It refuses a filter value that is not a string, a number or a boolean, and a
range comparison against a string.

## Algolia

```sh
pnpm add @priemskiyyy/scout-algolia algoliasearch
```

```ts
adapter: algolia({
  client,
  index: { name: "products" },
  sorts: {
    relevance: { index: { name: "products" } },
    priceAsc: { index: { name: "products_price_asc" } },
  },
  profiles: { default: {}, strict: { searchParams: { typoTolerance: false } } },
  paginationLimitedTo: 1000,
});
```

**Aborting does not cancel.** Version 5 of the Algolia client has no
`AbortSignal` anywhere, so this adapter declares `cancellation: "logical"`:
aborting stops Scout waiting and refuses the late answer, and Algolia keeps
computing the query and still bills for it. Debounce search as you type when
that matters. See [recipes](recipes.md).

**The client's own caches are bypassed by default.** `createTransporter` takes a
`requestsCache` and a `responsesCache`, and `searchSingleIndex` marks every
search `cacheable: true`, which the transporter reads as
`requestOptions.cacheable || request.cacheable`. A per request opt out is
therefore impossible, and a cached response would answer a TanStack Query
invalidation without ever reaching Algolia. The adapter calls
`searchSingleIndexWithHTTPInfo` instead, which is the only search call that
consults neither cache. Pass `cache: true` to use `searchSingleIndex` and let
the client's caches answer.

**A sort is a replica index.** Algolia has no per request sort parameter, so
every declared sort name maps to an index name, and that mapping is part of the
adapter fingerprint: the same sort name over a different replica is a different
result set.

Pages are zero-based and come back translated, `hitsPerPage` is capped at 1000,
and `paginationLimitedTo` is an index setting rather than a response field, so
the adapter takes it as configuration and assumes Algolia's default of 1000.
Matches past that window exist but cannot be paged to, so `page.next` is capped
at the last reachable page. Accuracy follows `exhaustive.nbHits`: `true` is
`"exact"`, `false` is `"estimated"`, and a missing flag is `"unknown"`.

The filter tree becomes one `filters` string, with numeric comparisons written
inside it rather than sent as `numericFilters`, so one parameter carries the
whole expression. A comparison or a range against a non numeric value throws
rather than being sent and misread.

Algolia only accepts AND clauses containing OR groups. An AND inside an OR, a
negated group or range, or an OR mixing numeric, facet and tag filters throws
`UnsupportedSearchFeatureError` before dispatch. See the
[Algolia boolean grammar](https://www.algolia.com/doc/guides/managing-results/refine-results/filtering/in-depth/combining-boolean-operators).
Profiles cannot set parameters owned by Scout, including filters and pagination.

## Meilisearch

```sh
pnpm add @priemskiyyy/scout-meilisearch meilisearch
```

```ts
adapter: meilisearch({
  index: client.index("products"),
  profiles: { default: {}, titles: { attributesToSearchOn: ["title"] } },
  sorts: { relevance: {}, priceAsc: { sort: ["price:asc"] } },
  pagination: "page",
  maxTotalHits: 1000,
});
```

Meilisearch answers a search two ways and the two disagree about how sure they
are, so the adapter keeps them apart:

- `pagination: "page"`, the default, sends `page` and `hitsPerPage` and reads
  `totalHits`, which is counted exhaustively up to the index's
  `pagination.maxTotalHits`. Below the cap the total is `"exact"` with scope
  `"matches"`; at the cap it is `"lower-bound"` with scope `"retrievable"`,
  because that is how many documents pagination can reach rather than how many
  matched.
- `pagination: "offset"` sends `offset` and `limit` and reads
  `estimatedTotalHits`, which is an estimate by design, so the total is
  `"estimated"` however small the number is.

Tell the adapter what your index's `maxTotalHits` is set to. It is also the
largest page the engine can fill, which is what `pagination.maxPageSize`
declares.

Highlights are built from markers the adapter generates per search rather than
from `_matchesPosition`, whose `start` and `length` are UTF-8 byte offsets and
not JavaScript string indexes. See [highlights](highlights.md).

The SDK's third argument is `Omit<RequestInit, "body" | "method">`, so the
signal survives and the request is really cancelled. Facets come from
`facetDistribution` with `facetStats` kept on the facet's `native`, and
`exhaustive` is `"unknown"` because Meilisearch never says whether a
distribution was cut short.

## Orama

```sh
pnpm add @priemskiyyy/scout-orama @orama/orama
```

```ts
adapter: orama({
  db,
  search,
  revision: () => revision,
  profiles: { default: {}, names: { properties: ["name"] } },
  sorts: {
    relevance: {},
    priceAsc: { sortBy: { property: "price", order: "ASC" } },
  },
});
```

Orama runs in the process that searches it, so a search costs no round trip, in
a browser, in a React Native app or on a server. Orama's own `search` function
is passed in beside the database, because Orama exports it as a function rather
than as a method, and that is what keeps this package free of a runtime import.

**A `string` property filters by token.** `where: { brand: "Acme Audio" }`
matches every document whose brand contains `acme` or `audio`, which is not what
`eq` means anywhere else in Scout. So the adapter translates a portable filter
only for the kinds Orama matches by value, `number`, `enum` and `boolean`, and
refuses the rest with `UnsupportedSearchFeatureError` rather than sending
something that quietly means less. The fix is in the Orama schema, not in your
search code: declare a field you mean to filter exactly as `enum`. Consumer code
does not change. See [filters](filters.md).

**The corpus revision is yours.** Scout does not watch your database. Nothing in
it reads, hooks or compares the corpus, so the application owns a revision and
the adapter folds it into the query identity. Bump it after an insert, an
update, a removal, a `load()` or a rebuild. Forget to bump it and TanStack Query
keeps answering from the old corpus; bump it too often and you lose cache hits,
which is the cheap mistake of the two. It must not be a credential, because it
reaches cache keys and devtools.

Totals are exact with scope `"matches"`, so whether another page exists is known
rather than guessed. There is no maximum page size. Facets work on `enum`,
`boolean` and `string` properties and are refused on a `number` property,
because Orama counts numbers into ranges the portable facet request does not
carry. Highlights are `"none"`: Orama's keyword search reports no match offsets,
and deriving them from a tokenizer this package cannot see would be fabricating
them. `.provider()` takes `never` here, because nothing is merged into the Orama
request.

## MiniSearch

```sh
pnpm add @priemskiyyy/scout-minisearch minisearch
```

```ts
adapter: minisearch({
  index: catalogue,
  revision: () => catalogueVersion,
  profiles: { default: { fields: ["title", "category"], prefix: true } },
  sorts: { relevance: "relevance" },
});
```

MiniSearch implements less of the contract than the others, and says so rather
than pretending. What it does declare is real.

**Filtering is real.** MiniSearch's `filter` option is a predicate it calls for
each candidate while it is still assembling results, so it sees every match and
not one page. Translating the filter AST into it narrows the set MiniSearch
itself counted: the total stays exact, and page two is still the real page two.

**Facets are refused, not scanned.** There is no facet index, so counts could
only come from materialising every match on every query and tallying it, which
is a full scan that stays invisible until the corpus grows. Counting the
returned page instead would be wrong in a way nobody can see.

**Relevance is the only order.** Every declared sort name maps to `"relevance"`
and may be an alias, so `sorts: { best: "relevance" }` lets an index declare
`best`. Any other name throws.

**Stored fields are not the document.** A result carries the id, the score, the
match report and only the fields in `storeFields`, while Scout validates the
whole document against the schema. Leave `resolve` off when every schema field
is stored; pass it when only some are, or when the schema's id field is not
named `id`. It runs before validation, so what it returns is what the schema
sees, and it runs for every match a filtered query considers rather than only
for the page, so keep it to a lookup.

`took` is `null`, because MiniSearch reports no timing of its own and the core
measures the call rather than being handed a number the adapter invented. The
corpus revision works exactly as it does for Orama.

## Swapping one for another

The index declaration is what ports. Changing the adapter changes the
configuration under `adapter:` and nothing else, and a name the new adapter does
not cover is a compile error in that configuration rather than a runtime
surprise at a call site.

What does not port is what the engines genuinely disagree about, and those
differences are visible rather than hidden: a facet on MiniSearch throws, a
highlight on Orama throws, a page of 500 on Typesense throws, and an abort on
Algolia stops your wait rather than the query. Read the table above before a
migration, not after.

## What is verified

Each adapter runs the shared conformance suite from
`@priemskiyyy/scout/testing`, which probes the declared capabilities and runs
only the blocks they admit, plus its own tests for the strings it emits, its
escaping, its page translation, its accuracy mapping and its highlight
construction.

Those tests are not equally strong, and the difference matters:

- Orama, MiniSearch and Fuse.js run against the real engine package with a real corpus,
  because the engine is in process and there is nothing to stand in for. Those
  tests are real by construction.
- Typesense, Algolia and Meilisearch are tested against an in-process fake of
  the SDK's shape, with a `*.contracts.ts` file pinning that fake and the
  adapter's structural types to the real SDK typings. A fake that reimplemented
  the engine's filter grammar would only prove the fake, so those tests assert
  the exact request the adapter sends rather than the results the fake invented.
  Delivery against a running server is a separate concern, and
  [verification](verification.md) is the matrix that says exactly what has been
  run against a real backend and what has not.

To add an engine of your own, see [writing an adapter](writing-an-adapter.md).

## HTTP, your own endpoint

`@priemskiyyy/scout-http` is the one adapter with no engine behind it. It is for
a search backend you own, whether that is a service wrapping Elasticsearch, a
handwritten endpoint over your database, or a gateway in front of one of the
engines above.

It deliberately does not decide what your request body or your response JSON
look like, because that would be a protocol imposed on every backend. You pass
`toRequest` and `fromResponse`, and your own `capabilities`. If you control both
ends, pass the `scoutWireRequest` and `scoutWireResponse` pair instead and skip
the decision.

One thing to understand before using it: for every other adapter, the capability
record is a statement the adapter's author verified against a real engine. Here
it is a promise you are making about your own backend, and nothing checks it. If
you declare `between: true` and your endpoint ignores ranges, Scout will send
the filter and believe the answer. The conformance suite is how you check
yourself: run `testSearchAdapter` against your real endpoint or a fake that
really evaluates filters, which is what this package's own tests do.

## Fuse.js

```sh
pnpm add @priemskiyyy/scout-fuse fuse.js
```

```ts
adapter: fuse({
  index: new Fuse(products, {
    keys: ["name", "description"],
    includeMatches: true,
    threshold: 0.3,
  }),
  revision: () => catalogueVersion,
  profiles: { default: null },
  sorts: { relevance: null },
});
```

Fuse 7.5 returns the complete match set. Scout evaluates portable filters over
that set before slicing pages, so totals are exact. Native scores, match data
and document references remain on the result. Match ranges become safe text
parts, including paths for array elements; malformed ranges become plain text.

Enable `includeMatches` on the injected instance before requesting highlights.
Facets are unsupported. Named sorts and profiles alias the instance's configured
matching and ordering; there are no per-request `.provider()` options. Change
`revision` when the corpus or configuration changes. Disposing Scout leaves the
borrowed engine usable. An allowed empty query returns the whole collection in
collection order, following Fuse 7.5.
