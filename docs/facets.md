---
description: "Result-scoped facet counts typed from the schema, values decoded by the core to the type the index declared, what exhaustive means, and why disjunctive facets are deferred rather than emulated."
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

## Declaring a facet declares its type

```ts
index({
  ...definition,
  facetable: { brand: "string", price: "number", inStock: "boolean" },
});
```

Each facetable field names the type of its values, and the compiler checks it
against the schema, so `price: "string"` does not compile when `price` is a
number. The declaration exists because several engines report every facet
value as a string, even for a numeric field, and nothing on the wire says what
the value was.

The core decodes every value to the declared type, for every engine: `"199"`
becomes `199` and `"true"` becomes `true`. A value that cannot be read as its
type, such as `"cheap"` for a number, fails the search with a `ScoutError`
whose code is `"provider"`, because it never arrives as something the type
does not allow. An adapter passes values on exactly as the engine sent them and
decodes nothing itself.

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
reports the element type, so faceting `tags` gives `string` and not `string[]`.
`native` keeps whatever the engine reported for that field, such as the raw
Typesense bucket list.

A facet that was requested and that the engine did not return is present and
empty rather than missing:

```ts
result.facets.brand;
// { field: "brand", values: [], exhaustive: "unknown", native: null }
```

So rendering never checks for `undefined`. An empty list means the engine
returned no buckets for that field, which is usually because nothing matched.

## `exhaustive` is the engine's own admission

`exhaustive` says whether the engine counted every match or only a sample. It is
`"unknown"` when the engine said nothing, and it is never inferred from the
number of buckets that arrived. Typesense reports `sampled` on each facet, so a
sampled facet is `false` and any other is `true`. [Adapters](adapters.md) says
what the others report.

A filter that can match nothing is answered by the core without the engine,
and then every requested facet is empty and `exhaustive: true`, because an
empty set is counted completely.

Selection state is never part of a facet: which values the user picked belongs
to the application, and Scout does not track it.

## An engine without facets refuses them

```ts
await miniProducts.search("boots").facets("brand").execute();
// ScoutError { code: "unsupported-feature" }
```

An adapter whose engine has no facets refuses a search that asks for one, before
anything runs. Counts could only be produced by tallying every match on every
query, a full scan that stays invisible until the corpus grows, or by counting
the page that came back, which produces numbers that are wrong in a way nobody
can see. [Adapters](adapters.md) says which engines refuse.

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
trip. No adapter does that today.

### Why it is deferred

The remote engines each support several searches in one round trip. No adapter
uses that endpoint yet: multi-search is a second request shape with its own
response mapping, its own identity rules and its own error surface, and it is
the thing disjunctive facets and facet value search would both be built on.
Leaving it out keeps one request shape in the contract.

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
