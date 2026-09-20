---
description: "Every method on the immutable search builder, what each one defaults to, and why a stored search is never changed by the one built from it."
---

# The search builder

`index.search(text)` returns a builder: an immutable description of one search.
Every method returns a new builder over a new description, and nothing is sent
until `execute()`.

```ts
const base = products.search("boots").pageSize(20);

const cheap = base.where((product) => product.price.lte(100));
const inStock = base.where((product) => product.inStock.eq(true));

const result = await cheap.execute();
```

`base` still means what it meant. `cheap` and `inStock` are two separate
searches that share nothing, and either of them can be stored, passed around or
executed twice.

## Immutability is the point

The description each builder holds is frozen, and each method copies it. That
has three consequences worth relying on:

- A builder handed to a function cannot be changed by that function.
- Building a search is cheap: no request, no work beyond copying a small object.
  Rebuilding one on every keystroke is fine, which is why debouncing lives in
  your code and not in the builder.
- Two builders that describe the same search produce the same `key()`. Facet and
  highlight names are de-duplicated and sorted first, so the order they were
  requested in does not matter. Repeated `where` calls keep their order, so
  `where(a).where(b)` and `where(b).where(a)` are two different keys for the
  same set of results.

## Defaults

A fresh builder starts with the query text you passed, the first declared
profile, the first declared sort, no filters, no facets, no highlights, page 1,
a page size of 20 and no provider options.

## `query(text)`

Replaces the query text. Useful when a stored builder carries the filters and
only the text changes.

```ts
const next = base.query("wireless headphones");
```

An empty string is refused at `execute()` unless the index declares
`emptyQuery: "allow"`. See [indexes](indexes.md).

## `profile(name)`

Selects one of the profiles the index declared. A profile is a named bundle of
engine settings that change which documents match or in what order.

```ts
products.search(text).profile("autocomplete");
```

A name the index did not declare is a compile error. See
[profiles and sorts](profiles-and-sorts.md).

## `where(build)`

Adds a filter. The callback receives one field object per filterable field and
the `and`, `or` and `not` helpers.

```ts
products
  .search(text)
  .where((product, { and, or }) =>
    and(
      product.inStock.eq(true),
      or(product.brand.eq("Sony"), product.brand.eq("Bose")),
    ),
  );
```

Repeated calls combine with AND, so a conditional filter is an ordinary `if`
and there is no `whereIf`:

```ts
let search = products.search(text);
if (selectedBrand !== null) {
  search = search.where((product) => product.brand.eq(selectedBrand));
}
```

The operators a field offers come from its type in the schema. Everything about
the AST, the normalisation rules and the empty set rules is in
[filters](filters.md).

## `sort(name)`

Selects one of the sorts the index declared.

```ts
products.search(text).sort("priceAsc");
```

What that name becomes is the adapter's business: a `sort_by` expression on
Typesense, a replica index on Algolia, an alias for relevance on MiniSearch.

## `facets(...names)`

Requests facets, and puts the requested fields on the result type.

```ts
const result = await products.search(text).facets("brand").execute();
result.facets.brand.values; // typed
result.facets.price; // compile error: never requested
```

Names accumulate across calls, and the requested set is de-duplicated and sorted
before it becomes part of the query identity, so `.facets("brand", "price")` and
`.facets("price").facets("brand")` are the same search. See
[facets](facets.md).

## `highlight(...names)`

Requests highlights, and puts the requested fields on every hit.

```ts
const result = await products.search(text).highlight("name").execute();
result.hits[0]?.highlights.name; // readonly HighlightFragment[]
```

Names accumulate, de-duplicate and sort the same way. A requested field the
engine did not highlight is present and empty rather than missing. See
[highlights](highlights.md).

## `page(number)` and `pageSize(size)`

Pages are one-based. Adapters translate provider numbering, so Algolia's page 0
arrives as page 1.

```ts
products.search(text).page(2).pageSize(50);
```

A page size above what the adapter declares in
`capabilities.pagination.maxPageSize` is refused before dispatch with the limit
named. See [pagination](pagination.md).

## `provider(options)`

Adapter typed provider options, for the engine parameters Scout does not model.

```ts
products.search(text).provider({ num_typos: 1 });
```

They take part in the query identity, so two searches differing only here do
not share a cache entry. They cannot override a field Scout owns: a key the
adapter lists in `reservedOptions` is refused with a `SearchConfigurationError`
naming the path, whether or not a portable filter is also present. See
[native access](native-access.md).

## `key()`

The canonical identity of this search, as an array.

```ts
const queryKey = products.search(text).facets("brand").key();
```

Two searches that mean the same thing produce the same key, and two that differ
in anything that changes results do not. It is useful for a log or a cache of
your own; the TanStack package uses it and adds nothing to it. The rules are in
[query identity](internals/query-identity.md).

## `execute(context)`

Sends the search and maps the answer.

```ts
const result = await products.search(text).execute({ signal });
```

It rejects on failure. Nothing in Scout returns an error value, because
`execute()` feeds TanStack Query, which only enters its error state when the
query function rejects.

The order inside `execute()` is fixed, and everything before the request leaves
is a pure function of what you built:

1. Refuse a disposed index or an empty query the index does not allow.
2. Refuse a provider option that collides with a field Scout owns.
3. Refuse a portable feature the adapter's capabilities deny.
4. Dispatch to the adapter with the signal.
5. Map the response into hits, page, total, facets and highlights, validating
   each document on the way.

Steps 1 to 3 happen before anything is sent, so a search that cannot mean what
it says never reaches the provider and never bills for it.

The `signal` is optional. Passing one lets an adapter with
`cancellation: "transport"` cancel the request itself; on a
`cancellation: "logical"` adapter it stops Scout waiting and refuses the late
answer while the engine keeps working. Either way the promise rejects with a
`SearchAbortedError` that says which of the two happened.
