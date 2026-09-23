---
description: "The two escape hatches out of the portable contract, provider options on the builder and the injected client on the index, and exactly what each one costs."
---

# Native access

Scout models the part of search that is portable. Everything else is still
reachable, through one of two doors.

```ts
const products = scout.index("products");

// Door one: provider options on the search. Still a Scout search.
const result = await products
  .search("boots")
  .provider({ num_typos: 0, prioritize_exact_match: true })
  .execute();

// Door two: the client the application injected. Not a Scout search.
const grouped = await products.native
  .collections("products")
  .documents()
  .search({ q: "boots", query_by: "name", group_by: "brand" }, {});
```

The first one stays inside the pipeline: it is validated, canonicalised and
mapped back into a `SearchResult`. The second one leaves the pipeline entirely
and hands you the engine's own response.

## Provider options with `.provider()`

`.provider(options)` takes the adapter's own option type, so the keys and their
types come from the engine you configured, not from Scout. Typesense takes
`TypesenseSearchOptions`, which is its search parameters without the ones Scout
writes. [Adapters](adapters.md) names the type for each engine.

Provider options take part in the query identity. Two searches that differ only
in what they passed to `.provider()` are two different searches and do not share
a cache entry. That is what makes them safe to use with TanStack Query, and it is
why they have to be plain data: a function, a symbol, `undefined`, `NaN`, an
infinite number, an invalid `Date`, an instance of a class or a circular
reference is refused with a `ScoutError` whose code is `"configuration"` and
whose message names the path. Refusing is the point, because a silently dropped
option would let two different searches share one cache entry. See
[query identity](internals/query-identity.md).

### What Scout writes, a provider option cannot

The query, the fields it runs against, the filter, the sort, the page, the page
size, the facets and the highlight markers all come from the search itself. An
adapter leaves those keys out of its option type, so setting one does not
compile, and lists them as its `reservedOptions`, so Scout refuses a JavaScript
caller that sets one anyway with a `"configuration"` error naming the key,
before anything is sent:

```js
// JavaScript, where nothing checks the option type.
// ScoutError { code: "configuration" }:
// provider.filter_by is written by Scout from the search itself.
await products.search("boots").provider({ filter_by: "brand:=Nike" }).execute();
```

The refusal does not depend on whether the search also used `.where()`. A
provider option that set the filter on a search without one would still change
what the search means behind its identity.

A parameter that changes which documents match on every search of a kind belongs
on a profile instead of on a call site. See
[profiles and sorts](profiles-and-sorts.md).

## The injected client with `index.native`

`index.native` is the client the application passed to the adapter, such as the
Typesense search client. It is the same object, not a wrapper, and Scout never
closes it.

Going through it skips the whole pipeline. Concretely, a native call gets:

- no refusal from Scout, so the engine answers with its own error for what it
  cannot do;
- no filter normalisation and no escaping, so a value carrying a quote or a
  filter keyword is yours to escape;
- no query identity, so nothing keyed by `search.key()` knows the call happened.
  A TanStack Query invalidation will not refetch it and a cached Scout result
  will not notice that it is now wrong;
- no document validation, so the response is the engine's `unknown` shape and
  not your declared document type;
- no total accuracy, no `page`, no facet decoding and no highlight parts. You get
  whatever the engine returned, markup included.

That is the price, and for the calls it is meant for it is the right price.

## `hit.native` and `result.native` cost nothing

`hit.native` is the engine's own hit and `result.native` is the whole response,
which is where the engine's own relevance score lives: Scout has no normalised
score, because two engines' scores are not comparable. `result.native` is
`null` only when Scout answered a filter that can match nothing without asking
the engine.

```ts
const result = await products.search("boots").execute();

// Typesense scores a hit with text_match; other engines put their own score
// on their own hit type.
const scores = result.hits.map((hit) => hit.native.text_match ?? 0);
```

Reading these keeps every guarantee: the hits were still validated, the total is
still honest, the search still has an identity.

## Which door to use

Use `.provider()` when what you need is a search parameter on the same call:
typo tolerance, a ranking knob, a crop length. The search stays a Scout search
and stays cacheable.

Use `index.native` when what you need is a different call or a different result
shape: a Typesense `group_by` search, which answers with `grouped_hits` instead
of `hits`, a multi-search, or a vector search. Those cannot be mapped onto the
portable result, so Scout does not pretend to, and the Typesense adapter refuses
`group_by` as a provider option with `"unsupported-feature"`.

A portable feature that an adapter refuses is a third case and neither door
fixes it. See [adapters](adapters.md) for what each engine refuses, and
[security](security.md) for why a filter is not an authorization boundary
whichever door you use.
