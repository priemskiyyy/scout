---
description: "Declare a typed index, bind a Typesense adapter to it, run one search end to end, read a result that says how certain it is, then hand the fetching to TanStack Query."
---

# Getting started

This page runs one search against a real remote engine, Typesense, and then
puts it behind TanStack Query. Every other adapter is wired the same way: the
index declaration does not change, only the adapter bound to it does.

```sh
pnpm add @priemskiyyy/scout @priemskiyyy/scout-typesense typesense zod
```

## Declare what a document is

An index starts from a schema. Scout reads the document type from it at compile
time, which is where the filter operators, the facet value types and the hit
type all come from.

```ts
// search/Product.ts
import { z } from "zod";

export const Product = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string(),
  price: z.number(),
  inStock: z.boolean(),
  tags: z.array(z.string()),
});
```

## Declare the index

```ts
// search/products.ts
import { index } from "@priemskiyyy/scout";
import { Product } from "./Product";

export const products = index({
  schema: Product,
  id: (product) => product.id,
  searchable: ["name", "brand"],
  filterable: ["brand", "price", "inStock", "tags"],
  facetable: { brand: "string" },
  highlightable: ["name"],
  sorts: { priceAsc: { price: "asc" } },
  profiles: { autocomplete: { searchable: ["name"] } },
});
```

Each part shows up later as a compile error rather than a runtime surprise:

- `searchable` is what the query text runs against. Only text fields qualify.
- `filterable`, `facetable` and `highlightable` are the fields a search may
  filter, facet and highlight. A field outside them does not exist on the
  builder. `facetable` also says what type each facet value is.
- `sorts` and `profiles` are named behaviours your application asks for. Every
  index also has `"relevance"`, the engine's own order, and `"default"`, which
  searches `searchable`. See [profiles and sorts](profiles-and-sorts.md).
- `id` is stable identity for a document. It is never a hit's position.
- `schema` is what turns the engine's `unknown` into a `Product`.

The declaration names no engine, and declaring it opens nothing.

## Bind an engine to it

```ts
// search/scout.ts
import { Scout } from "@priemskiyyy/scout";
import { typesense } from "@priemskiyyy/scout-typesense";
import { SearchClient } from "typesense";
import { products } from "./products";

const client = new SearchClient({
  nodes: [{ host: "search.example.com", port: 443, protocol: "https" }],
  apiKey: SEARCH_ONLY_API_KEY,
});

export const scout = new Scout({
  indexes: { products },
  adapters: { products: typesense({ client, collection: "products" }) },
});
```

Every index needs an adapter under the same name, and every adapter needs an
index. A missing or extra one is a compile error, and a `ScoutError` when the
`Scout` is built, so the mistake never waits for a search.

Creating a `Scout` opens nothing and sends nothing. It holds no results and no
cache. One instance per application, and one per security context: see
[security](security.md).

## Run a search

```ts
import { scout } from "./search/scout";

const products = scout.index("products");

const result = await products
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
  .highlight("name")
  .page({ size: 20 })
  .execute();
```

`product.price.lte(300)` exists because `price` is a number in the schema and
was declared filterable. `product.brand.between("a", "b")` does not exist,
because `between` on a string has no portable meaning across these engines.
`.sort("priceDesc")` does not exist, because the index never declared it.

Nothing is sent until `execute()`. Every builder method returns a new builder,
so building one on every keystroke is cheap and a stored search is never
changed by a later one. [The search builder](search-builder.md) has the rest.

## Read the result

```ts
const names = result.hits.map((hit) => hit.document.name);
const brands = result.facets.brand.values; // { value: string, count: number }[]
const took = result.took; // { milliseconds: number, source: "provider" | "scout" }
```

`hit.document` is a `Product` because the schema validated it. `hit.id` is
whatever `id()` returned, so it is stable across pages and refetches.
`result.facets.brand` is typed because `brand` was requested, and
`result.facets.price` is a compile error because it was not.

The total is the part most wrappers throw away:

```ts
const getLabel = (total: SearchTotal) => {
  if (total.accuracy === "unknown") {
    return "Many results";
  }

  if (total.accuracy === "exact") {
    return `${total.value} results`;
  }

  return `About ${total.value} results`;
};
```

The `"unknown"` branch carries no `value` at all, so the compiler makes you
handle it. Each accuracy maps to something the engine actually reported, and
Scout never fabricates a count. [Pagination](pagination.md) covers the whole
model.

Highlights come back as parts rather than HTML:

```tsx
const title = result.hits[0]?.highlights.name.flatMap((fragment) =>
  fragment.parts.map((part) =>
    part.matched ? <mark key={part.text}>{part.text}</mark> : part.text,
  ),
);
```

A document cannot inject markup through a highlight, because there is no markup
to inject. See [highlights](highlights.md).

## Hand the fetching to TanStack Query

Scout owns search semantics, query identity, translation and page metadata.
TanStack Query owns caching, staleness, retries and infinite page storage.
Scout sets none of those defaults.

```sh
pnpm add @priemskiyyy/scout-tanstack-query @tanstack/react-query
```

```ts
import { useQuery } from "@tanstack/react-query";
import { queryOptions } from "@priemskiyyy/scout-tanstack-query";
import { scout } from "./search/scout";

const products = scout.index("products");

export const useProductSearch = (text: string) =>
  useQuery({
    ...queryOptions(products.search(text).facets("brand").highlight("name")),
    staleTime: 30_000,
  });
```

The query key is `search.key()`, the canonical identity of that search, so two
searches that mean the same thing share a cache entry and two that differ in
anything that changes results do not. The `signal` TanStack supplies reaches
`execute({ signal })`, so an unmounted component stops waiting at once, and the
adapters whose SDK can cancel a request cancel it.

An empty query is not an error. It browses: every document the filter allows,
in the requested order. Pass `enabled: text.length > 0` only if your screen
should show nothing before the first keystroke.

For a list that grows:

```ts
import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  flattenHits,
  infiniteQueryOptions,
} from "@priemskiyyy/scout-tanstack-query";

const query = useInfiniteQuery({
  ...infiniteQueryOptions(products.search(text)),
  staleTime: 30_000,
});

const hits = useMemo(() => flattenHits(query.data), [query.data]);
```

`flattenHits` de-duplicates by `hit.id`, which is needed rather than tidy: page
numbering plus an index that changed between two fetches means page two can
hand back part of page one. [TanStack Query](tanstack-query.md) explains that
and what happens when an engine will not say whether a next page exists.

## When the engine cannot do it

An adapter refuses what its engine cannot express, and says so before it sends
anything:

```ts
// ScoutError { code: "unsupported-feature" }: MiniSearch reports no facets.
await minisearchBacked.search("boot").facets("category").execute();
```

It is never dropped, and it is never emulated over the one page that came back,
because a silently narrower search returns results that look right and are not.
[Adapters](adapters.md) says what each engine refuses, and
[troubleshooting](troubleshooting.md) lists what each error code means.

## Next

- [Indexes](indexes.md) for the schema, the id, the field declarations and
  validation.
- [Filters](filters.md) for the operators per field type and the empty set rules.
- [Adapters](adapters.md) to pick an engine, or to see what changes if you swap.
- [Security](security.md) before you ship a search key to a browser.
