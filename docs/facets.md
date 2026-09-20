---
description: "Result-scoped facet counts typed from the schema, what exhaustive means per engine, and why disjunctive facets are deferred rather than emulated."
---

# Facets

Ask for a facet by name and it appears on the result type.

```ts
const result = await products.search("boots").facets("brand").execute();

result.facets.brand.values;
// [{ value: "Acme", count: 42 }, { value: "Bolt", count: 17 }]
```

`result.facets.price` does not compile here, because the search never requested
it. `products.search("boots").facets("name")` does not compile either, because
`name` was never declared facetable on the index.

## What a facet carries

```ts
type SearchFacet<TValue> = {
  field: string;
  values: readonly { value: TValue; count: number }[];
  exhaustive: boolean | "unknown";
  native: unknown;
};
```

`TValue` comes from the schema field, not from the wire. `brand` is a `string`
in the schema, so `values[0].value` is a `string`. A facet on an array field
reports the element type, so faceting `tags` would give `string` and not
`string[]`. `native` keeps whatever the engine reported for that field, such as
Meilisearch's `facetStats` or the raw Typesense bucket list.

A facet that was requested and that the engine did not return is present and
empty rather than missing:

```ts
result.facets.brand;
// { field: "brand", values: [], exhaustive: "unknown", native: null }
```

So rendering never checks for `undefined`. An empty list means the engine
returned no buckets for that field, which is usually because nothing matched.

## `exhaustive` is the engine's own admission

`exhaustive` says whether the engine counted every distinct value or stopped
early. It is `"unknown"` when the engine said nothing, and it is never inferred
from the number of buckets that arrived, except where the engine reports the
distinct count separately.

| Adapter     | Source                                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| Typesense   | `facet_counts[].sampled`, inverted: a sampled facet is not exhaustive                                     |
| Algolia     | `exhaustive.facetValues`, and `"unknown"` when the flag is absent                                         |
| Meilisearch | always `"unknown"`, because it never says whether `maxValuesPerFacet` cut the list short                  |
| Orama       | `true` when the returned bucket count equals the distinct count Orama reported, `false` when it truncated |
| MiniSearch  | no facets at all, see below                                                                               |

Orama truncates a `string` property's facet to its own limit past ten values, so
a facet over a high cardinality string property is routinely `false`. Selection
state is never part of this: which values the user picked belongs to the
application, and Scout does not track it.

## Facet values are coerced by the adapter

Typesense reports every facet value as a string, even for a numeric field, and
only the application knows what the field really is. Declare it in the adapter
configuration:

```ts
typesense({
  client,
  collection: "products",
  profiles,
  sorts,
  facets: { price: "number", inStock: "boolean" },
});
```

A field left out of that map arrives as the string Typesense sent, which will
not match the `number` the schema promised. A value that does not read as a
number is also kept as the string it came as, because a bucket labelled `NaN` is
worse than a bucket labelled with the text the engine sent.

Orama refuses a facet on a `number` property with
`UnsupportedSearchFeatureError`. Orama counts numbers into ranges, and a
portable facet request carries no ranges to give it, so there is nothing honest
to translate.

## MiniSearch has no facets, and says so

```ts
await miniProducts.search("boots").facets("brand").execute();
// UnsupportedSearchFeatureError: The minisearch adapter does not report facets.
```

`facets.resultScoped` is `false` there, so the refusal happens before anything
runs. MiniSearch has no facet index and no facet option. Counts could only be
produced by materialising every match on every query and tallying it, which is a
full scan that stays invisible until the corpus grows, or by counting the page
that came back, which produces numbers that are wrong in a way nobody can see.
For facets over a local corpus, use the Orama adapter.

## Counts are scoped to the result, including the filter on that field

Every facet Scout returns is counted under the search as it was sent, filters
included. If a search filters `brand.eq("Acme")` and facets `brand`, the count
next to `Acme` is the count under that filter, and the other brands are absent
or zero. That is what the engines return for a single query, and Scout does not
rewrite it.

A faceted filter UI usually wants the other number: how many results each brand
would give if it were selected instead. That is a disjunctive facet, and it
needs the facet on a field to be counted with that field's own filter removed.
Producing it means sending several queries, one per filtered facet, in one round
trip.

`facets.excludeOwnFilter` and `facets.searchValues` are `false` on every adapter
today, and a search that needed them would be refused rather than answered
approximately. The capability exists so that an adapter can declare it honestly
once it is implemented.

### Why it is deferred

All three remote engines support multi-search in one round trip, and Algolia,
Meilisearch and Typesense each expose it. No adapter uses that endpoint yet.
Multi-search is a second request shape with its own response mapping, its own
identity rules and its own error surface, and it is the thing disjunctive facets
and facet value search would both be built on. Leaving it out of the first
version keeps one request shape in the contract.

Until then, an application that needs disjunctive counts has two honest options.
Run a second search per facet field yourself, each one filtered without that
field, and read its facet. Or reach the engine directly through
[native access](native-access.md), which bypasses Scout's identity and result
mapping, and say so in the code that does it.

The one thing not to do is compute the counts from the page you got back. A page
is not the result set, and the numbers will look plausible.

Keep reading: [filters](filters.md) for what a filter does to a count,
[the search builder](search-builder.md) for where `.facets()` sits in a chain,
and [adapters](adapters.md) for the comparison across engines.

## Numeric and boolean facet labels

Typesense, Algolia and Meilisearch encode facet labels as strings. Declare the
encoding in the adapter configuration for each non-string facetable field:

```ts
facets: { price: "number", inStock: "boolean" }
```

The adapter converts those labels before returning them. A malformed number or
boolean rejects with `SearchProviderError`; it never arrives as a string in a
facet typed as numeric or boolean. Fields omitted from this configuration retain
the provider's string labels. Scout cannot infer the encoding by inspecting a
Standard Schema validator, so configure it to match your index declaration.
