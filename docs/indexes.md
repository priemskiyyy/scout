---
description: "Declare an index: its schema and document id, which fields a search may run against, filter, facet and highlight, its named sorts and profiles, and what happens to a document that fails validation."
---

# Indexes

An index is the portable contract between your application and whichever engine
is behind it. It declares what a document is, how a document is identified, and
what a search may do with its fields.

```ts
import { index } from "@priemskiyyy/scout";

const products = index({
  schema: Product,
  id: (product) => product.id,
  searchable: ["name", "brand"],
  filterable: ["brand", "price", "inStock", "tags"],
  facetable: { brand: "string", price: "number" },
  highlightable: ["name"],
  sorts: { priceAsc: { price: "asc" } },
  profiles: { autocomplete: { searchable: ["name"] } },
});
```

Only `schema`, `id` and `searchable` are required. Declaring an index opens
nothing and sends nothing, and it names no engine. The declaration is checked
once, copied and frozen, so changing the object you passed in afterwards
changes nothing.

A declaration that cannot work does not compile: an `id` that is not a
function, an empty `searchable` list, a direction other than `"asc"` or
`"desc"`, a facet type the field does not have, a field the schema does not
have, and a sort named `relevance` or a profile named `default`, which are
built in. The one mistake a type cannot state, a sort with no fields such as
`{}`, is refused on the spot with a `ScoutError` whose code is
`"configuration"`.

## One Scout, named indexes

```ts
const scout = new Scout({
  indexes: { products, orders },
  adapters: {
    products: typesense({ client, collection: "products" }),
    orders: typesense({ client, collection: "orders" }),
  },
});

const products = scout.index("products");
```

Each index is bound to the adapter under the same name. An index without an
adapter, or an adapter without an index, is a compile error, and the `Scout`
constructor refuses it too, for a caller the compiler cannot see. One
declaration can be bound to different engines in different `Scout` instances,
which is how the example application runs one index on three engines.

The names in `indexes` flow into the argument type of `scout.index`, so
`scout.index("orders")` is typed and `scout.index("ordres")` is a compile error.
A name built from a string at runtime still reaches the runtime guard, which
throws a `ScoutError` listing the names that do exist.

`scout.index(name)` returns the same frozen handle every time, so calling it in
a render is fine. A handle holds no state: `name`, `search(text)`, and `native`,
the client the adapter was given.

Nothing in the core branches on an adapter name, so adding a provider is one new
package and no change here.

## The schema

`schema` is any [Standard Schema](https://standardschema.dev) validator: Zod,
Valibot, ArkType or your own object with a `~standard` member. It does two jobs.

At compile time, Scout reads the document type out of it. That is where
`hit.document`, the operators each field offers, the fields that may be
searched and the facet value types all come from.

At runtime, every hit is validated before it becomes a `SearchHit`. The
validator is the only thing that turns an engine's `unknown` into the type you
declared, which is why there is no mode that skips validation and still claims a
document type.

Validation is synchronous only. A validator that returns a promise is a
validation failure rather than something Scout awaits, because a page of fifty
hits would otherwise await fifty times.

## The document id

```ts
id: (product) => product.id;
```

`id` runs on the validated document, so it sees the type you declared. It must
be stable: the same document has to produce the same id on every page and every
refetch, because `hit.id` is the only handle Scout gives you for a result. A
hit's position is not identity. A refetch that repopulates from page one
invalidates every offset, and the bug only appears past page one.

Two hits with the same id are kept rather than deduplicated or rejected. Scout
only ever sees one page, so a duplicate is an index or an `id` problem, and
failing a live search over it would be worse than rendering it. De-duplication
across pages belongs to the consumer, and `flattenHits` in the TanStack package
does it; see [recipes](recipes.md).

## Searchable

```ts
searchable: ["name", "brand"],
```

The fields the query text runs against by default. Only a text field
qualifies, a string or a list of strings, so `searchable: ["price"]` is a
compile error. The list is what the built-in `"default"` profile searches, and
a named profile can search other fields. See
[profiles and sorts](profiles-and-sorts.md).

## Filterable, facetable and highlightable

Each one may only name keys of the document, and each one decides what a
search can ask for:

- `filterable` builds the field objects a `where` callback receives. A field
  outside this list does not exist on that object, and the operators a field
  does have come from its type in the schema. See [filters](filters.md).
- `facetable` maps each field `.facets(...)` accepts to the type of its values,
  `"string"`, `"number"` or `"boolean"`, checked against the schema, so
  `facetable: { brand: "number" }` does not compile when `brand` is a string.
  Some engines report every facet value as a string, so the index says once
  what a value is and the core decodes it for every engine. See
  [facets](facets.md).
- `highlightable` is what `.highlight(...)` accepts. See
  [highlights](highlights.md).

They are declarations about your application, not about the engine. Whether the
engine can serve them is the adapter's business, and an adapter that cannot
refuses the search with `"unsupported-feature"` rather than answering a
narrower one. Leaving a list out is fine: an index with no `facetable` has no
faceted UI.

Declaring a field here does not configure the engine. A Typesense collection
still needs the field marked `facet: true`, a Meilisearch index still needs it
in `filterableAttributes`, and an Orama schema still needs the right property
kind. Scout has no indexing or admin API, so the engine side stays yours.

## Sorts and profiles

```ts
sorts: { priceAsc: { price: "asc" } },
profiles: { autocomplete: { searchable: ["name"] } },
```

A sort is named and defined by the fields it orders by. A profile is named and
defined by the fields its query text runs against. Every index also has
`"relevance"`, the engine's own order, and `"default"`, which searches
`searchable`, and a new search starts with those two.
[Profiles and sorts](profiles-and-sorts.md) explains what each one becomes in
an engine.

## Invalid documents

```ts
index({ ...definition, validate: "skip" });
```

`validate` decides what happens when a hit fails the schema:

- `"error"`, the default, rejects the whole search with a `ScoutError` whose
  code is `"validation"`. The message ends with what the validator said, and
  its issues are on `cause`.
- `"skip"` drops the offending hits and reports how many on `result.skipped`.
  That number matters: dropping a hit changes what the page contains, so a page
  of twenty with `skipped: 3` really returned seventeen.

There is no third mode. Skipping validation entirely would hand your own `id()`
an unchecked value and make the document type a claim that nothing checks.

## Disposal

```ts
scout.dispose();
```

Disposal is synchronous. Every search still in flight rejects at once with a
`ScoutError` whose code is `"disposed"`, whatever the engine is doing, so a
disposed `Scout` cannot produce results. Then each adapter is disposed once,
even when another one throws; a single failure is rethrown afterwards, and
several arrive as one `AggregateError`. Repeated calls do nothing. Clients you
injected are left alone, because Scout borrowed them and does not own their
lifetime.

Dispose on a security context change rather than reusing an instance across
accounts. See [security](security.md).
