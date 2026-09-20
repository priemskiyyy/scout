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

The first one stays inside the pipeline: it is validated, canonicalised, checked
against capabilities and mapped back into a `SearchResult`. The second one leaves
the pipeline entirely and hands you the provider's own response.

## Provider options with `.provider()`

`.provider(options)` takes the adapter's own search parameter type, so the keys
and their types come from the engine you configured, not from Scout. Typesense
takes `TypesenseSearchParameters`, Algolia takes `AlgoliaSearchParams`,
Meilisearch takes `MeilisearchSearchOptions` and MiniSearch takes its profile
shape. The Orama adapter declares its native options as `never`, because it
merges nothing into the Orama request, so `.provider()` cannot be called on an
Orama backed index at all.

Provider options take part in the query identity. Two searches that differ only
in what they passed to `.provider()` are two different searches and do not share
a cache entry. That is what makes them safe to use with TanStack Query, and it is
why they have to be serialisable: `canonicalize` throws a
`SearchConfigurationError` naming the path when a value has no canonical form, a
function, a symbol, `undefined`, `NaN`, an infinite number, an invalid `Date` or
an instance of a class. It refuses rather than dropping the value, because a
silently dropped option would let two different searches share one cache entry.
See [query identity](internals/query-identity.md).

### Reserved keys are refused, always

A provider option may not set a field Scout already decided. Each adapter lists
those keys in `reservedOptions`, and the core refuses any `.provider()` payload
that touches one with a `SearchConfigurationError` whose `path` names the key.

```ts
// SearchConfigurationError: filter_by is owned by Scout on the typesense
// adapter, so a provider option cannot set it.
await products.search("boots").provider({ filter_by: "brand:=Nike" }).execute();
```

The refusal does not depend on whether the search also used `.where()`. Scout
owns filtering, paging, sorting, faceting and the highlight markers, so a
provider option that sets one of them is refused on its own.

| Adapter     | Reserved keys                                                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typesense   | `q`, `query_by`, `prefix`, `filter_by`, `sort_by`, `facet_by`, `page`, `per_page`, `highlight_fields`, `highlight_start_tag`, `highlight_end_tag`, `group_by`                           |
| Algolia     | `filters`, `query`, `page`, `hitsPerPage`, `facets`, `attributesToHighlight`, `highlightPreTag`, `highlightPostTag`, `numericFilters`, `facetFilters`, `tagFilters`, `offset`, `length` |
| Meilisearch | `filter`, `q`, `page`, `hitsPerPage`, `offset`, `limit`, `sort`, `facets`, `attributesToHighlight`, `highlightPreTag`, `highlightPostTag`                                               |
| MiniSearch  | `filter`                                                                                                                                                                                |
| Orama       | none, because nothing is merged into the Orama request                                                                                                                                  |

A parameter that changes which documents match on every search of a kind belongs
on a profile instead of on a call site. See
[profiles and sorts](profiles-and-sorts.md).

## The injected client with `index.native`

`index.native` is the provider client the application passed to the adapter. It
is the same object, not a wrapper, and Scout never closes it.

| Adapter     | `index.native` is                                    |
| ----------- | ---------------------------------------------------- |
| Typesense   | the search client                                    |
| Algolia     | the search client                                    |
| Meilisearch | the index client, the result of `client.index(name)` |
| Orama       | the database                                         |
| MiniSearch  | the `MiniSearch` instance                            |

Going through it skips the whole pipeline. Concretely, a native call gets:

- no capability check, so the engine answers with its own error rather than
  `UnsupportedSearchFeatureError` before anything is sent;
- no filter normalisation and no escaping, so a value carrying a quote or a
  filter keyword is yours to escape;
- no query identity, so nothing keyed by `search.key()` knows the call happened.
  A TanStack Query invalidation will not refetch it and a cached Scout result
  will not notice that it is now wrong;
- no document validation, so the response is the provider's `unknown` shape and
  not your declared document type;
- no total accuracy, no `page`, no facet coercion and no highlight parts. You get
  whatever the engine returned, markup included.

That is the price, and for the calls it is meant for it is the right price.

## `hit.native` and `result.native` cost nothing

Both are always populated, on every adapter, on every search. `hit.native` is the
engine's own hit and `result.native` is the whole response, which is where the
provider's own relevance score lives: Scout has no normalised score, because two
engines' scores are not comparable.

```ts
const result = await products.search("boots").execute();

// Typesense scores a hit with text_match; Algolia, Orama and MiniSearch each
// put their own score on their own hit type.
const scores = result.hits.map((hit) => hit.native.text_match ?? 0);
```

Reading these keeps every guarantee: the hits were still validated, the total is
still honest, the search still has an identity.

## Which door to use

Use `.provider()` when what you need is a search parameter on the same call:
typo tolerance, a ranking knob, a crop length, `distinct`, `matchingStrategy`.
The search stays a Scout search and stays cacheable.

Use `index.native` when what you need is a different call or a different result
shape: a Typesense `group_by` search, which answers with `grouped_hits` instead
of `hits`, an Algolia multi-search, Meilisearch federated, hybrid or vector
search, or Orama vector search. Those cannot be mapped onto the portable result,
so Scout does not pretend to.

A portable feature that an adapter refuses is a third case and neither door
fixes it. See [adapters](adapters.md) for what each engine declares, and
[security](security.md) for why a filter is not an authorization boundary
whichever door you use.
