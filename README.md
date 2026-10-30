# Scout

**Typed, provider-independent search for TypeScript.**

Write one typed search and run it against Algolia, Meilisearch, Typesense,
MongoDB Search, Elasticsearch, OpenSearch, Orama, MiniSearch or Fuse.js. Scout normalizes the part of application search that is
genuinely portable: typed indexes, a typed filter builder, named search and sort
profiles, pagination, facets, safe highlights and deterministic query identity.

It tells you what an engine cannot do instead of pretending, and it preserves
how certain a result count actually is.

TanStack Query keeps the fetching and caching it is already good at.

## npm preview

The initial npm preview uses the `next` dist-tag. Add `@next` when installing
Scout packages. This release includes the core, TanStack Query integration,
HTTP, Typesense, Meilisearch, MongoDB Search, Elasticsearch, OpenSearch,
Orama, MiniSearch and Fuse.js adapters.

The Algolia adapter is available as source while hosted-provider verification
continues. See [verification](docs/verification.md) for the tested environments
and remaining limits. The API may change during the preview.

## Search something

```sh
pnpm add @priemskiyyy/scout@next @priemskiyyy/scout-typesense@next zod
```

```ts
import { Scout, index } from "@priemskiyyy/scout";
import { typesense } from "@priemskiyyy/scout-typesense";
import { z } from "zod";

const Product = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string(),
  price: z.number(),
  inStock: z.boolean(),
});

const products = index({
  schema: Product,
  id: (product) => product.id,
  searchable: ["name", "brand"],
  filterable: ["brand", "price", "inStock"],
  facetable: { brand: "string" },
  highlightable: ["name"],
  sorts: { priceAsc: { price: "asc" } },
});

const scout = new Scout({
  indexes: { products },
  adapters: { products: typesense({ client, collection: "products" }) },
});

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
was declared filterable. `product.brand.between(...)` does not exist, because
`between` on a string has no portable meaning. `.sort("priceDesc")` does not
exist, because the index never declared it. An empty query browses.

## Three things that make it different

**It does not lie about counts.** Every total carries how it was arrived at.

```ts
result.total; // { value: 1249, accuracy: "estimated", scope: "matches" }
```

`exact`, `estimated`, `lower-bound` or `unknown`. Each one maps to something the
engine actually reported: Algolia's `exhaustive.nbHits`, Typesense's
`search_cutoff`, Meilisearch's estimated versus exhaustive pagination. Most
wrappers throw this away and show you a number. Scout keeps it, so you can
render "About 1,249" when that is the truth.

**It refuses instead of degrading.** An engine that cannot do what you asked
refuses before anything is sent:

```ts
// ScoutError { code: "unsupported-feature" }: MiniSearch has no facet index.
```

No adapter is allowed to filter or sort the page it got back to fake a feature
it does not have. That produces results that look right and are not.

**Swapping engines swaps one adapter.** The index declares everything a search
can use, its fields, its sorts and its profiles, and names no engine. Binding
another engine replaces one line under `adapters`, and an engine that needs
configuration for a declared sort, such as an Algolia replica, fails to compile
without it.

## With TanStack Query

```sh
pnpm add @priemskiyyy/scout-tanstack-query@next
```

```ts
import {
  queryOptions,
  infiniteQueryOptions,
  flattenHits,
} from "@priemskiyyy/scout-tanstack-query";

const search = scout.index("products").search(text).page({ size: 20 });

useQuery(queryOptions(search));
useInfiniteQuery(infiniteQueryOptions(search));
```

Scout owns search semantics, query identity, translation and page metadata.
TanStack Query owns caching, staleness, retries, deduplication and infinite page
storage. Scout sets none of those defaults for you.

## Adapters

| Package                            | Engine                      | Refuses                                                                  |
| ---------------------------------- | --------------------------- | ------------------------------------------------------------------------ |
| `@priemskiyyy/scout-typesense`     | Typesense                   | pages over 250, sorts by more than three fields                          |
| `@priemskiyyy/scout-algolia`       | Algolia                     | pages over 1000, filters its boolean grammar rejects                     |
| `@priemskiyyy/scout-meilisearch`   | Meilisearch                 | pages over `maxTotalHits`                                                |
| `@priemskiyyy/scout-mongodb`       | MongoDB Search, server only | string filters and facets off a `token` field, number and boolean facets |
| `@priemskiyyy/scout-elasticsearch` | Elasticsearch, server only  | pages past `max_result_window`                                           |
| `@priemskiyyy/scout-opensearch`    | OpenSearch, server only     | pages past `max_result_window`                                           |
| `@priemskiyyy/scout-orama`         | Orama, in process           | highlights, number facets, sorts by several fields                       |
| `@priemskiyyy/scout-minisearch`    | MiniSearch, in process      | facets and highlights                                                    |
| `@priemskiyyy/scout-fuse`          | Fuse.js, in process         | facets, and highlights without `includeMatches`                          |
| `@priemskiyyy/scout-http`          | your own JSON endpoint      | whatever your backend refuses                                            |

The HTTP adapter takes your own client, the way Flare's does: you give it one
`request` function that sends the portable search with the address,
authentication and headers your client already owns, and resolves with your
backend's answer in the scout wire format. A backend refuses a feature with a
small refusal body.

An aborted search settles at once on every engine. Typesense, Meilisearch,
MongoDB, Elasticsearch and OpenSearch also stop the request on the wire, and so
does HTTP when your client passes the signal on; Algolia's client takes no
signal, so an aborted Algolia search may still run and still bill.

Writing your own is first class: see `docs/writing-an-adapter.md`.

## What Scout is not

It is not an InstantSearch replacement, a TanStack Query replacement, a
universal Elasticsearch DSL, an indexing or admin SDK, a vector database
abstraction, a cross-engine rank merger, or an authorization system. Client
filters are not a security boundary; use restricted credentials.

If you want search widgets, use InstantSearch. If you want custom application
search with typed portable semantics and TanStack Query, Scout should fit.

## Status

In development. `docs/verification.md` says exactly what has been tested against
a real engine and what has not.

MIT licensed.
