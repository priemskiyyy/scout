---
title: Scout
titleTemplate: Typed, provider-independent search for TypeScript
description: "One typed search that runs against Typesense, Algolia, Meilisearch, MongoDB Search, Elasticsearch, OpenSearch, Orama, MiniSearch or Fuse.js, with honest totals, safe highlights, deterministic query identity and TanStack Query left in charge of caching."
---

# Scout

Write one typed search and run it against Typesense, Algolia, Meilisearch,
MongoDB Search, Elasticsearch, OpenSearch, Orama, MiniSearch or Fuse.js. Scout normalizes the part of application search
that is genuinely portable: typed indexes, a typed filter builder, named sorts
and profiles, pagination, facets, safe highlights and deterministic query
identity.

[Get started](getting-started.md) · [Choose an adapter](adapters.md) ·
[TanStack Query](tanstack-query.md) ·
[GitHub](https://github.com/priemskiyyy/scout)

```sh
pnpm add @priemskiyyy/scout @priemskiyyy/scout-typesense typesense zod
```

## One search, typed end to end

```ts
const result = await scout
  .index("products")
  .search("wireless headphones")
  .where((product, { and, or }) =>
    and(
      product.inStock.eq(true),
      product.price.lte(300),
      or(product.brand.eq("Sony"), product.brand.eq("Bose")),
    ),
  )
  .sort("priceAsc")
  .facets("brand")
  .page({ size: 20 })
  .execute();
```

`product.price.lte(300)` exists because `price` is a number in the schema and
the index declared it filterable. `product.brand.between("a", "b")` does not
exist, because `between` on a string has no portable meaning across these
engines. `.sort("priceDesc")` does not exist, because the index never declared
it.

## One index, any engine

```ts
const products = index({
  schema: Product,
  id: (product) => product.id,
  searchable: ["name", "brand"],
  filterable: ["brand", "price", "inStock"],
  facetable: { brand: "string" },
  sorts: { priceAsc: { price: "asc" } },
});

const scout = new Scout({
  indexes: { products },
  adapters: { products: typesense({ client, collection: "products" }) },
});
```

The index names no engine. It declares what a document is, which fields a
search may use, and what each sort orders by. The adapter is bound next to it,
so swapping engines changes one line and no call site.

## It keeps the uncertainty the engine reported

```ts
result.total; // { value: 1249, accuracy: "estimated", scope: "matches" }
```

A total is `exact`, `estimated`, a `lower-bound` or `unknown`, and each one maps
to something the engine actually said, such as Typesense's `search_cutoff`. The
`unknown` branch carries no number at all, so the compiler makes you handle it.
Scout never fabricates a count or a page total. [Pagination](pagination.md) has
the whole model.

## It refuses instead of degrading

An engine that cannot express what you asked for refuses before anything is
sent:

```ts
// ScoutError { code: "unsupported-feature" }: MiniSearch reports no facets.
```

No adapter filters or sorts the page it got back to fake a feature it does not
have, because that produces results that look right and are not.
[Adapters](adapters.md) says what each engine refuses.

## TanStack Query keeps its job

```ts
useQuery({ ...queryOptions(search), staleTime: 30_000 });
useInfiniteQuery(infiniteQueryOptions(search));
```

Scout owns search semantics, query identity, translation and page metadata.
TanStack Query owns caching, staleness, retries, deduplication and infinite page
storage. Scout sets none of those defaults for you, and the query key is the
canonical identity of the search, so two searches that mean the same thing share
a cache entry. See [TanStack Query](tanstack-query.md).

## Where to go next

| If you want to                        | Read                                          |
| ------------------------------------- | --------------------------------------------- |
| run one search end to end             | [Getting started](getting-started.md)         |
| see what each engine can really do    | [Adapters](adapters.md)                       |
| declare an index properly             | [Indexes](indexes.md)                         |
| write a filter                        | [Filters](filters.md)                         |
| render counts and pages honestly      | [Pagination](pagination.md)                   |
| render matches without HTML           | [Highlights](highlights.md)                   |
| build search as you type              | [Recipes](recipes.md)                         |
| ship a search key to a browser        | [Security](security.md)                       |
| support an engine that has no adapter | [Writing an adapter](writing-an-adapter.md)   |
| know exactly what is in a cache key   | [Query identity](internals/query-identity.md) |
| know what has actually been tested    | [Verification](verification.md)               |

## What Scout is not

It is not an InstantSearch replacement, a TanStack Query replacement, a
universal Elasticsearch DSL, an indexing or admin SDK, a vector database
abstraction, a cross-engine rank merger or an authorization system. A filter is
a search parameter and not a security boundary, so per tenant and per user
restrictions belong in a restricted credential from the engine.

If you want ready made search widgets, use InstantSearch. If you want your own
application search with typed portable semantics and TanStack Query underneath,
Scout should fit.

Released under the MIT License.
