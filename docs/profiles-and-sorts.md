---
description: "Named sorts defined by the fields they order by, named profiles defined by the fields they search, what each becomes in an engine, and how an adapter tunes a profile or serves a sort from configuration of its own."
---

# Profiles and sorts

An index names the behaviours its application asks for, and defines each one by
fields of the document.

```ts
const products = index({
  schema: Product,
  id: (product) => product.id,
  searchable: ["name", "brand"],
  filterable: ["brand", "price", "inStock", "tags"],
  sorts: {
    priceAsc: { price: "asc" },
    cheapestByName: { price: "asc", name: "asc" },
  },
  profiles: { autocomplete: { searchable: ["name"] } },
});
```

Once the index is bound to a `Scout`, a search asks for a name and nothing
else:

```ts
const result = await scout
  .index("products")
  .search("boots")
  .profile("autocomplete")
  .sort("priceAsc")
  .execute();
```

`.sort("priceDesc")` does not compile, because the index never declared that
sort. Neither does `.profile("fuzzy")`.

## Sorts

A sort lists the fields it orders by, in priority order, each with `"asc"` or
`"desc"`. `cheapestByName` above sorts by price and breaks ties by name. Each
field has to be a field of the document, so a typo is a compile error.

`"relevance"` always exists. It is the engine's own order and the one a search
starts with, which is why an index may not define a sort of that name.

The adapter receives the definition, its name and its fields, and writes the
engine's own sort from it:

| Engine    | `priceAsc` becomes                                    |
| --------- | ----------------------------------------------------- |
| Typesense | `sort_by: "price:asc"`, at most three fields          |
| Algolia   | a search of the replica configured for `priceAsc`     |
| an engine | whatever its API spells, or a refusal where it cannot |

An engine that cannot express a sort refuses it with `"unsupported-feature"`
when the search runs, for example Typesense with a fourth field. An in-process
engine can sort every match before it pages, which is the honest version of the
same thing. No adapter sorts the page it got back.

### Sorts an engine serves from its own configuration

Algolia has no per request sort. An alternative order is a replica index, so its
adapter takes one replica per sort:

```ts
replicas: { priceAsc: "products_price_asc" },
```

That configuration has to cover every sort the index declares. A missing one is
a compile error where the adapters are bound, and a `ScoutError` when the
`Scout` is built, never a surprise at a call site. A replica for a sort the
index never declared is refused the same way, because it is a typo that would
otherwise do nothing. The exact options are in [adapters](adapters.md).

## Profiles

A profile lists the fields its query text runs against. `"default"` always
exists and searches the index's `searchable` fields, which is why an index may
not define a profile of that name. The adapter receives the profile's name and
its fields, and runs the query against those.

A profile is a name rather than a parameter because the behaviour behind it is
yours to tune per engine. An adapter can take tuning keyed by profile name:

```ts
typesense({
  client,
  collection: "products",
  profiles: { autocomplete: { prefix: true }, default: { prefix: false } },
});
```

The call site stays `products.search(text).profile("autocomplete")` on every
engine. What autocomplete means on this one lives in one configuration object,
next to the client it belongs to. Tuning is optional, and tuning for a profile
the index never declared is refused when the `Scout` is built.

Anything that is genuinely per search, rather than per named behaviour, goes
through `.provider()` instead, which takes adapter typed options and takes part
in the query identity. See [native access](native-access.md).

## Both are part of the query identity

The key holds the sort's definition, not only its name, and the profile's name
together with its fields. Two searches that ask for the same name over a
declaration that changed do not share a cache entry. See
[query identity](internals/query-identity.md).
