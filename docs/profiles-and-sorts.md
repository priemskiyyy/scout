---
description: "Why an index declares its sort and profile names and the adapter is required to satisfy them, and what one name becomes in each engine."
---

# Profiles and sorts

An index declares the names its application uses. The adapter is configured with
one entry per name.

```ts
const products = index({
  schema: Product,
  id: (product) => product.id,
  filterable: ["brand", "price", "inStock", "tags"],
  facetable: ["brand"],
  highlightable: ["name"],
  sorts: ["relevance", "priceAsc"],
  profiles: ["default", "autocomplete"],
  adapter: typesense({
    client,
    collection: "products",
    profiles: {
      default: { queryBy: ["name", "brand"], prefix: true },
      autocomplete: { queryBy: ["name"], prefix: true },
    },
    sorts: { relevance: {}, priceAsc: { sortBy: "price:asc" } },
  }),
});
```

A search then asks for a name and nothing else:

```ts
const result = await products
  .search("boots")
  .profile("autocomplete")
  .sort("priceAsc")
  .execute();
```

`products.search("boots").sort("priceDesc")` does not compile, because the index
never declared that sort. Neither does `.profile("fuzzy")`.

## The names are the portable contract

The index owns the vocabulary and the adapter satisfies it. That direction is
deliberate. If the names came from the adapter configuration instead, dropping a
sort while swapping providers would break every call site that used it. Declared
on the index, the same mistake is a type error inside the adapter configuration,
which is where migration work belongs:

```ts
adapter: typesense({
  client,
  collection: "products",
  profiles: { default: { queryBy: ["name"] } },
  // Missing `priceAsc`, so this object does not satisfy
  // Record<"relevance" | "priceAsc", TypesenseSort> and the index call fails
  // to compile here.
  sorts: { relevance: {} },
});
```

The check is a compile time one. It does not survive a JavaScript caller, a name
built from a string at runtime, or an adapter whose configuration was assembled
with a wider type. In those cases the adapter is the one that refuses, at search
time, with `UnsupportedSearchFeatureError` for a sort it cannot translate.

## The first name is the default

`sorts[0]` is the sort a search uses when it does not call `.sort()`, and
`profiles[0]` is the profile it uses when it does not call `.profile()`. In the
example above that is `relevance` and `default`. Order the tuples accordingly:
there is no separate default field to set, and no way to declare a name that is
never reachable as a default other than putting it second.

## What one name becomes in each engine

The name stays the same across engines. What it maps to does not.

| Engine      | A sort is                                         | A profile is                                                       |
| ----------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| Typesense   | `{ sortBy: "price:asc" }`, a `sort_by` string     | `{ queryBy: ["name", "brand"], prefix: true }`                     |
| Algolia     | `{ index: { name: "products_price_asc" } }`       | `{ searchParams: { typoTolerance: false } }`                       |
| Meilisearch | `{ sort: ["price:asc"] }`                         | `{ attributesToSearchOn: ["title"] }` and the other search options |
| Orama       | `{ sortBy: { property: "price", order: "ASC" } }` | `{ properties, boost, tolerance, threshold }`                      |
| MiniSearch  | `"relevance"`, the only order it has              | `{ fields, boost, prefix, fuzzy, combineWith, bm25 }`              |

Two of those mappings change how the configuration is written rather than how a
search is written.

Algolia has no per request sort parameter. An alternative order is a replica
index, so a Scout sort name maps to an index name and the adapter searches that
index instead:

```ts
algolia({
  client,
  index: { name: "products" },
  sorts: {
    relevance: { index: { name: "products" } },
    priceAsc: { index: { name: "products_price_asc" } },
  },
  profiles: { default: {} },
});
```

The replica mapping is part of the adapter fingerprint, because the same sort
name over a different replica is a different result set. See
[query identity](internals/query-identity.md).

MiniSearch orders by BM25 score and takes no sort option, so every sort name it
is configured with is an alias for relevance:

```ts
minisearch({
  index: catalogue,
  revision: () => catalogueVersion,
  profiles: { default: { fields: ["title"], prefix: true } },
  sorts: { relevance: "relevance", best: "relevance" },
});
```

An index may declare `best` and get score order. A sort name the adapter was not
configured with throws `UnsupportedSearchFeatureError` when the search runs,
because ordering another way would mean sorting every match on every query.
Orama refuses an unconfigured sort or profile name the same way.

## Why a profile is a name and not an option

A profile carries the engine knobs that change which documents match or in what
order: which fields the query text runs against, prefix and fuzzy behaviour,
boosts, typo tolerance, thresholds. Those are not portable. `queryBy` has no
Algolia spelling and `typoTolerance` has no MiniSearch spelling, so passing them
per call would put provider vocabulary in application code and break on the next
adapter.

Naming them instead keeps the call site portable. `products.profile("autocomplete")`
means the same thing on every engine: the search behaviour this application
calls autocomplete. What that behaviour is written as lives in one configuration
object, next to the client it belongs to.

Anything that is genuinely per search, rather than per named behaviour, goes
through `.provider()` instead, which takes adapter typed options and takes part
in the query identity. See [native access](native-access.md) for what that
costs.

## Building an adapter

Call `createSearchAdapter({ ... })` with no explicit type arguments. The
adapter's whole type is inferred from the value, which is what keeps the literal
keys of `sorts` and `profiles`. A `Readonly<Record<string, unknown>>` satisfies a
record of any literal keys, so an adapter whose declared type erased those names
would make the coverage requirement above vacuous and every engine would look
like it supported every sort. That happened once during development and the type
contract did not catch it, because the mock originally re-attached its declared records
after construction.

[Writing an adapter](writing-an-adapter.md) has the rest of the contract, and
[adapters](adapters.md) compares what each engine can do.
