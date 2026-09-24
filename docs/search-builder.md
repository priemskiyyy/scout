---
description: "Every method on the immutable search builder, what each one defaults to, and why a stored search is never changed by the one built from it."
---

# The search builder

`index.search(text)` returns a builder: an immutable description of one search.
Every method returns a new builder over a new description, and nothing is sent
until `execute()`.

```ts
const base = products.search("boots").page({ size: 20 });

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

- A builder handed to a function cannot be changed by that function. Filter
  operands and provider options are copied when they are added, so changing the
  array you passed afterwards changes nothing either.
- Building a search is cheap: no request, no work beyond copying a small object.
  Rebuilding one on every keystroke is fine, which is why debouncing lives in
  your code and not in the builder.
- Two builders that describe the same search produce the same `key()`. Facet and
  highlight names are de-duplicated and sorted first, so the order they were
  requested in does not matter. Repeated `where` calls keep their order, so
  `where(a).where(b)` and `where(b).where(a)` are two different keys for the
  same set of results.

## Defaults

A fresh builder starts with the query text you passed, the `"default"` profile,
the `"relevance"` sort, no filters, no facets, no highlights, page 1, a page
size of 20 and no provider options.

## `query(text)`

Replaces the query text. Useful when a stored builder carries the filters and
only the text changes.

```ts
const next = base.query("wireless headphones");
```

An empty string browses: every document the filter allows, in the requested
order. The text is sent as it is and never trimmed.

## `profile(name)`

Selects a profile the index declared, or `"default"`. A profile names the
fields the query text runs against.

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

Selects a sort the index declared, or `"relevance"`.

```ts
products.search(text).sort("priceAsc");
```

The adapter receives the sort's definition, its name and the fields it orders
by, and turns it into the engine's own: a `sort_by` expression on Typesense, a
replica index on Algolia.

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

## `page({ current, size })`

Moves to a page, resizes it, or both, and keeps what it leaves out. Pages are
one-based. Adapters translate the engine's numbering, so Algolia's page 0
arrives as page 1.

```ts
products.search(text).page({ current: 2, size: 50 });
products.search(text).page({ size: 50 }).page({ current: 3 }); // page 3 of 50
```

Zero, a negative number, a fraction, and a bare number such as `page(2)` are
refused as you call them, with a `ScoutError` whose code is
`"configuration"`. A page size the engine cannot
serve is refused by the adapter with `"unsupported-feature"` when the search
runs, before anything is sent. See [pagination](pagination.md).

## `provider(options)`

Adapter typed provider options, for the engine parameters Scout does not model.

```ts
products.search(text).provider({ num_typos: 1 });
```

The type is the adapter's own, the engine's parameters without the ones Scout
writes, such as the query, the filter or the page. A JavaScript caller that
passes one of those anyway is refused by the adapter with `"configuration"`.

Provider options take part in the query identity, so two searches differing only
here do not share a cache entry. See [native access](native-access.md).

## `key()`

The canonical identity of this search, as an array.

```ts
const queryKey = products.search(text).facets("brand").key();
```

Two searches that mean the same thing produce the same key, and two that differ
in anything that changes results do not. It is useful for a log or a cache of
your own; the TanStack package uses it and adds nothing to it. The rules are in
[query identity](internals/query-identity.md).

`key()` resolves the search against its index to build that identity, so a
mistake the compiler could not see, such as a sort name read from a URL, throws
the same `"configuration"` error here that `execute()` would reject with.

## `execute(context)`

Sends the search and maps the answer.

```ts
const result = await products.search(text).execute({ signal });
```

It rejects on failure and never throws synchronously. Nothing in Scout returns
an error value, because `execute()` feeds TanStack Query, which only enters its
error state when the query function rejects.

The order inside `execute()` is fixed:

1. Refuse a disposed `Scout` or a signal that has already aborted.
2. Resolve the search against its index: the sort and profile names, the facet,
   highlight and filter fields, and the provider options and filter values,
   which must have a canonical form. Anything wrong is a `"configuration"`
   error.
3. Answer a filter that can match nothing without asking the engine.
4. Hand the request to the adapter with a signal, and wait for the adapter, the
   caller's signal or disposal, whichever comes first.
5. Map the answer into hits, page, total, facets and highlights, validating
   each document on the way.

Nothing reaches the engine before step 4, and an adapter refuses what its
engine cannot express before it sends anything, so a search that cannot mean
what it says is never sent and never billed.

The `signal` is optional. When it aborts, the promise rejects at once with a
`ScoutError` whose code is `"aborted"` and whose `cause` is the signal's
reason, and an answer that arrives later is refused. React Native's
`AbortSignal` has no `reason`, so there the `cause` is `undefined`. The adapter gets the
signal too, so an engine whose SDK can cancel a request cancels it; one that
cannot finishes the work while Scout has already stopped waiting.
