---
description: "Compare the Scout adapters by what each engine refuses, and see how each one is configured."
---

# Adapters

An adapter maps one engine onto the portable contract and nothing more. It owns
translation, escaping, page numbering and the honesty of totals, facets and
highlights. It owns no cache, no retries and no page accumulation, and the core
owns cancellation, disposal, page derivation and facet decoding for all of them.

The index declaration does not change from one engine to the next. Only the
adapter bound to it does:

```ts
const scout = new Scout({
  indexes: { products },
  adapters: {
    products: typesense({ client, collection: "products" }),
  },
});
```

What an engine cannot express, its adapter refuses with a `ScoutError` whose
`code` is `"unsupported-feature"`, before anything is sent. It is never dropped
and never emulated over the one page that came back, because a silently
narrower search returns results that look right and are not.

## What each adapter refuses

Every value below comes from the adapter's source, not from vendor
documentation.

| Adapter        | Filters                             | Sorts                          | Facets                            | Highlights            | Largest page                        | Cancels on the wire |
| -------------- | ----------------------------------- | ------------------------------ | --------------------------------- | --------------------- | ----------------------------------- | ------------------- |
| Typesense      | All nine                            | Up to three fields             | Yes                               | Yes                   | 250                                 | Yes                 |
| Algolia        | AND clauses of OR groups, see below | Through replicas               | Yes                               | Yes                   | 1000                                | No                  |
| Meilisearch    | All nine                            | Yes                            | Yes                               | Yes                   | `maxTotalHits`, default 1000        | Yes                 |
| MongoDB Search | All nine, strings on `token` fields | Yes, strings on `token` fields | Strings on `token` fields         | Yes                   | No limit                            | Yes                 |
| Elasticsearch  | All nine                            | On exact fields                | On exact fields                   | Yes                   | `max_result_window`, default 10,000 | Yes                 |
| OpenSearch     | All nine                            | On exact fields                | On exact fields                   | Yes                   | `max_result_window`, default 10,000 | Yes                 |
| Orama          | On `number`, `enum` and `boolean`   | One field                      | On `string`, `enum` and `boolean` | Refused               | No limit                            | No                  |
| MiniSearch     | All nine, over stored fields        | Any, in process                | Refused                           | Refused               | No limit                            | No                  |
| Fuse.js        | All nine                            | Any, in process                | Refused                           | With `includeMatches` | No limit                            | No                  |
| HTTP           | What your backend accepts           | What your backend accepts      | What your backend accepts         | Your mapping          | What your backend accepts           | Yes                 |

The nine filter operators are `eq`, `neq`, `in`, `notIn`, `gt`, `gte`, `lt`,
`lte` and `between`. Typesense, Algolia, Meilisearch, MongoDB Search,
Elasticsearch and OpenSearch are remote engines.
Orama, MiniSearch and Fuse.js run in process. HTTP wraps your own endpoint.
Each adapter hands the injected client back through `native`.

An aborted search always settles the caller at once, whatever the engine does.
"Cancels on the wire" says whether the request itself stops. Where it does not,
the engine may still be computing and, on a hosted engine, still billing.

## Typesense

```sh
pnpm add @priemskiyyy/scout-typesense typesense
```

```ts
typesense({
  client,
  collection: "products",
  profiles: { exact: { prefix: false } },
});
```

The filter becomes one `filter_by` string. Equality is exact `:=` and never the
token matching `:`, so a filter on `red` cannot also return `dark red`. Groups
are parenthesised and a negation is pushed down to the fields, because Typesense
negates a field and never a group. A sort becomes `sort_by`, an empty query is
sent as `*`, and `found` is exact unless `search_cutoff` says the engine
stopped counting early. Typesense reports every facet value as a string, and
Scout reads it back as the type the index declared. A grouped search is
refused, because it answers with a result shape Scout does not map.

## Algolia

```sh
pnpm add @priemskiyyy/scout-algolia algoliasearch
```

```ts
algolia({
  client: algoliasearch(appId, searchOnlyApiKey),
  indexName: "products",
  replicas: { priceAsc: "products_price_asc" },
  profiles: { titles: { typoTolerance: false } },
});
```

**A sort is a replica index.** Algolia has no per search sort, so every sort
the index declares needs a replica under `replicas`. A missing one is a compile
error, and a construction error for a JavaScript caller.

**Aborting does not cancel.** Version 5 of the Algolia client takes no
`AbortSignal`, so Algolia keeps computing an aborted query and still bills for
it. Debounce search as you type when that matters. See [recipes](recipes.md).

**The client's own caches are bypassed by default,** because a cached response
would answer a TanStack Query invalidation without reaching Algolia. Pass
`cache: true` to let them answer.

Pages are zero based and come back translated. `paginationLimitedTo` is an
index setting rather than a response field, so the adapter takes it as
configuration, 1000 unless you changed it: the pages end at that window, while
the total still counts every match. Accuracy follows `exhaustive.nbHits`.

Algolia only accepts AND clauses of OR groups. An AND inside an OR, a negated
group or range, or an OR mixing numeric, facet and tag filters is refused. See
the
[Algolia boolean grammar](https://www.algolia.com/doc/guides/managing-results/refine-results/filtering/in-depth/combining-boolean-operators).

## Meilisearch

```sh
pnpm add @priemskiyyy/scout-meilisearch meilisearch
```

```ts
meilisearch({
  index: client.index("products"),
  profiles: { titles: { matchingStrategy: "all" } },
  pagination: "page",
  maxTotalHits: 1000,
});
```

Meilisearch answers a search two ways, and the two disagree about how sure they
are:

- `pagination: "page"`, the default, reads `totalHits`, counted exhaustively up
  to the index's `pagination.maxTotalHits`. Below the cap the total is
  `"exact"`; at the cap it is a `"lower-bound"` of what paging can reach.
- `pagination: "offset"` reads `estimatedTotalHits`, which is `"estimated"`
  however small it is.

Tell the adapter your index's `maxTotalHits`. It is also the largest page the
engine can fill. Highlights come from markers made for each search rather than
from `_matchesPosition`, whose offsets count UTF-8 bytes and not JavaScript
string indexes. A facet's `exhaustive` is `"unknown"`, because Meilisearch never
says whether it cut a distribution short.

## MongoDB Search

```sh
pnpm add @priemskiyyy/scout-mongodb mongodb
```

```ts
mongodb({
  collection: client.db("shop").collection("products"),
  index: "products",
  tokens: ["brand", "category"],
});
```

A search becomes one aggregation pipeline: `$search` holding one `compound`,
then `$skip` and `$limit`. The driver runs only on a server, so put it behind
your own endpoint for a browser.

**A string compares only on a `token` field.** MongoDB Search's `equals`, `in`,
facets and sorts read a string only on a field its index maps as `token`, so
list those fields in `tokens`. A string filter or facet on any other field is
refused, and so are number and boolean facets. A sort cannot be checked the
same way, because the adapter cannot tell a string field from a number, and a
sort by a string field that is not a `token` comes back in an arbitrary order
without an error. Map every string field a sort reads as `token`.

There is no operator for every document, so a browse matches every document
holding one of the searched fields. The default count is exact up to 1000,
and above it MongoDB answers 1001, which Scout reports as a lower bound;
`exactTotals: true` counts every match. Facets are never known to be
exhaustive, and highlights arrive as passages already split into parts.

## Elasticsearch

```sh
pnpm add @priemskiyyy/scout-elasticsearch @elastic/elasticsearch
```

```ts
elasticsearch({
  client,
  index: "products",
  keywords: { brand: "brand.keyword" },
});
```

The filter becomes a JSON `bool` query under `filter`, so it never changes a
score and the facets count the same documents as the hits. A value travels as
JSON, so nothing is escaped. The client runs only on a server, so put it
behind your own endpoint for a browser.

**A text field is compared by its tokens.** A `term` on a `text` field meets
the analysed tokens, so `Nimbus` finds nothing in a field that indexed
`nimbus`, and Elasticsearch refuses to sort or aggregate one. `keywords` names
the exact field beside each text field, such as the `.keyword` a dynamic
mapping adds, and filters, facets and sorts read it. A field not listed must be
mapped as `keyword`, a number or a boolean.

A total is exact for the relation `eq` and a lower bound for `gte`, which
Elasticsearch reaches at 10,000 matches unless `trackTotalHits: true` counts
every one. A search that timed out or lost a shard is a lower bound too, and
its facets are not exhaustive. Paging ends at the index's `max_result_window`,
10,000 unless you pass `maxResultWindow`, while the total keeps counting.

## OpenSearch

```sh
pnpm add @priemskiyyy/scout-opensearch @opensearch-project/opensearch
```

```ts
opensearch({
  client,
  index: "products",
  keywords: { brand: "brand.keyword" },
});
```

The translation is the one the Elasticsearch adapter uses, shared between the
two, so everything above holds here. The OpenSearch client takes no signal, so
an abort calls `abort()` on the request it returned, and the search still stops
on the wire. `result.native` is the answer body, without the transport's
headers and metadata.

## Orama

```sh
pnpm add @priemskiyyy/scout-orama @orama/orama
```

```ts
orama({
  db,
  search,
  revision: () => revision,
  profiles: { forgiving: { tolerance: 2 } },
});
```

Orama's `search` function is passed in beside the database, because Orama
exports it as a function rather than a method, and that keeps this package free
of a runtime import.

**A `string` property filters by token.** `where: { brand: "Acme Audio" }`
matches every brand containing `acme` or `audio`, which is not what `eq` means
anywhere else in Scout. So a filter on a `string` property is refused. Declare a
field you filter exactly as `enum` in the Orama schema; consumer code does not
change. Orama counts numbers into ranges the portable facet request does not
carry, so a `number` facet is refused too, and so is any highlight, because
Orama's keyword search reports no match offsets.

**The corpus revision is yours.** Nothing in Scout watches your database, so the
application owns a revision and the adapter folds it into the query identity.
Bump it after an insert, an update, a removal or a rebuild. It reaches cache
keys and devtools, so it must not be a credential.

## MiniSearch

```sh
pnpm add @priemskiyyy/scout-minisearch minisearch
```

```ts
minisearch({
  index: catalogue,
  wildcard: MiniSearch.wildcard,
  revision: () => catalogueVersion,
  profiles: { titles: { prefix: true, fuzzy: 0.2 } },
});
```

MiniSearch filters with a predicate it calls for every candidate, so the total
stays exact, and the adapter sorts the whole match set before it cuts a page.
An empty query browses through `MiniSearch.wildcard`, which only exists from
7.2 and which the adapter cannot import, so pass it in; without it an empty
query is refused. Facets and highlights are refused: there is no facet index to
count from and no match offsets to split. A result carries only `storeFields`,
so every field a filter or a sort reads must be stored, or produced by
`resolve`.

## Fuse.js

```sh
pnpm add @priemskiyyy/scout-fuse fuse.js
```

```ts
fuse({
  index: new Fuse(documents, {
    keys: ["name", "description"],
    includeMatches: true,
  }),
  revision: () => catalogueVersion,
});
```

Fuse returns every match, so the adapter filters, sorts and pages the whole set
in process and the total is exact. A profile over fewer keys than Fuse indexes
becomes a Fuse logical query naming each of them, which extended and token
search cannot run, so there it is refused. Highlights need `includeMatches` on
the instance you pass. Facets are refused.

## HTTP, your own endpoint

```sh
pnpm add @priemskiyyy/scout-http
```

```ts
http({
  fingerprint: "catalogue-api",
  request: async ({ search, signal }) => {
    const response = await fetch("https://api.example.com/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(search),
      signal,
    });

    if (!response.ok) {
      throw new Error(`The search endpoint answered ${response.status}.`);
    }

    return response.json();
  },
});
```

`@priemskiyyy/scout-http` is for a search backend you own, reached through your
own client. You give it one `request` function, and your client keeps the
address, authentication, headers, retries and status handling. The adapter owns
the wire format: it hands `request` the portable search, whose
`JSON.stringify(search)` is its wire form, and `request` resolves with the
backend's answer typed as a `ScoutWireResponse`. Your client owns that answer's
shape the way it owns the address, so a client that does not trust its backend
validates the JSON with its own schema library before returning it, and the
index's schema still validates every document. `fingerprint` names the
backend, without a credential, because it takes part in every query key.

Your backend refuses a feature by answering `{ "refusal": { "message": "..." } }`,
which reaches the caller as `unsupported-feature`, and it can say how far
paging reaches with `retrievable`. Anything else that fails is a `provider`
error. The search stops on the wire only when your `request` passes `signal`
on. Nothing checks what your backend claims, so run the conformance suite
against it. See [writing an adapter](writing-an-adapter.md).

## Swapping one for another

The index declaration is what ports. Swapping engines replaces one adapter and
nothing else. What the engines genuinely disagree about stays visible: a facet
on MiniSearch is refused, a highlight on Orama is refused, a page of 500 on
Typesense is refused, and an abort on Algolia stops your wait rather than the
query. Read the table above before a migration, not after.

## What is verified

Each adapter runs the shared conformance suite from
`@priemskiyyy/scout/testing` over an index its tests declare, plus its own tests
for what it sends and how it reads the answer. Orama, MiniSearch and Fuse.js run
the real engine in process. Typesense, Algolia, Meilisearch, MongoDB Search,
Elasticsearch and OpenSearch run against an in-process fake pinned to the real
SDK's types, so their filters are asserted as the exact request sent, and all
of them but Algolia run the conformance suite against the real engine in Docker
too. [Verification](verification.md) says exactly what has
and has not been run against a real backend.
