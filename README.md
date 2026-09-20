# Scout

**Typed, provider-independent search for TypeScript.**

Write one typed search and run it against Algolia, Meilisearch, Typesense,
Orama, MiniSearch or Fuse.js. Scout normalizes the part of application search that is
genuinely portable: typed indexes, a typed filter builder, named search and sort
profiles, pagination, facets, safe highlights and deterministic query identity.

It tells you what an engine cannot do instead of pretending, and it preserves
how certain a result count actually is.

TanStack Query keeps the fetching and caching it is already good at.

## Search something

```sh
pnpm add @priemskiyyy/scout @priemskiyyy/scout-typesense zod
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

const scout = new Scout({
  indexes: {
    products: index({
      schema: Product,
      id: (product) => product.id,
      filterable: ["brand", "price", "inStock"],
      facetable: ["brand"],
      highlightable: ["name"],
      sorts: ["relevance", "priceAsc"],
      profiles: ["default"],
      adapter: typesense({
        client,
        collection: "products",
        profiles: { default: { queryBy: ["name"] } },
        sorts: { relevance: {}, priceAsc: { sortBy: "price:asc" } },
      }),
    }),
  },
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
  .pageSize(20)
  .execute();
```

`product.price.lte(300)` exists because `price` is a number in the schema and
was declared filterable. `product.brand.between(...)` does not exist, because
`between` on a string has no portable meaning. `.sort("priceDesc")` does not
exist, because the index never declared it.

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

**It refuses instead of degrading.** An engine that cannot express a filter you
asked for throws before anything is sent:

```ts
// UnsupportedSearchFeatureError: the minisearch adapter does not report facets.
```

No adapter is allowed to filter or sort the page it got back to fake a feature
it does not have. That produces results that look right and are not.

**Swapping engines is a compile error, not a runtime surprise.** An index
declares its sort and profile names, and the adapter is required to cover them.
Change provider and forget a sort, and the error lands in the adapter
configuration where the migration work belongs, never at a call site.

## With TanStack Query

```sh
pnpm add @priemskiyyy/scout-tanstack-query
```

```ts
import {
  queryOptions,
  infiniteQueryOptions,
  flattenHits,
} from "@priemskiyyy/scout-tanstack-query";

const search = scout.index("products").search(text).pageSize(20);

useQuery(queryOptions(search));
useInfiniteQuery(infiniteQueryOptions(search));
```

Scout owns search semantics, query identity, translation and page metadata.
TanStack Query owns caching, staleness, retries, deduplication and infinite page
storage. Scout sets none of those defaults for you.

## Adapters

| Package                          | Engine                 | Cancellation | Highlights         | Facets       |
| -------------------------------- | ---------------------- | ------------ | ------------------ | ------------ |
| `@priemskiyyy/scout-typesense`   | Typesense              | transport    | parts              | yes          |
| `@priemskiyyy/scout-algolia`     | Algolia                | logical      | parts              | yes          |
| `@priemskiyyy/scout-meilisearch` | Meilisearch            | transport    | parts              | yes          |
| `@priemskiyyy/scout-orama`       | Orama, in process      | logical      | none               | yes          |
| `@priemskiyyy/scout-minisearch`  | MiniSearch, in process | logical      | none               | no           |
| `@priemskiyyy/scout-fuse`        | Fuse.js, in process    | logical      | parts when enabled | no           |
| `@priemskiyyy/scout-http`        | your own JSON endpoint | transport    | your mapping       | your mapping |

The HTTP adapter owns the plumbing every backend needs, which is `fetch`, the
abort signal, status and parse failures, and a fingerprint with the credentials
stripped out. Your application owns what only it can know: the request and
response mapping, and its own capability declaration, because only you know what
your backend can do. A `scoutWire` request and response pair ships alongside for
anyone who controls both ends, which puts a whole adapter at about twenty lines
without imposing a wire format on anyone who does not.

`logical` means aborting stops Scout waiting but the engine may still be running
and still billing, because its SDK takes no `AbortSignal`. That is a fact about
the client, not a shortcut, and it is why the capability exists.

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
