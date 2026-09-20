---
description: "Declare an index: its schema and document id, which fields may be filtered, faceted and highlighted, the sort and profile names it uses, and what happens to a document that fails validation."
---

# Indexes

An index is the portable contract between your application and whichever engine
is behind it. It declares what a document is, how a document is identified, and
which fields a search may filter, facet and highlight.

```ts
import { index } from "@priemskiyyy/scout";

const products = index({
  schema: Product,
  id: (product) => product.id,
  filterable: ["brand", "price", "inStock", "tags"],
  facetable: ["brand"],
  highlightable: ["name"],
  sorts: ["relevance", "priceAsc"],
  profiles: ["default", "autocomplete"],
  adapter: typesense({ client, collection: "products", profiles, sorts }),
});
```

Declaring an index opens nothing and sends nothing. It builds the field objects
for `where` callbacks once and captures its schema, id function, adapter,
policies and default sort/profile names. Changing the original configuration
afterward does not reconfigure the index. Create a new declaration to change it.
The declaration is frozen; injected provider clients remain application-owned.

## One Scout, named indexes

```ts
const scout = new Scout({ indexes: { products, orders } });

const products = scout.index("products");
```

The names in `indexes` flow into the argument type of `scout.index`, so
`scout.index("orders")` is typed and `scout.index("ordres")` is a compile error.
A name built from a string at runtime still reaches the runtime guard, which
throws a `SearchConfigurationError` listing the names that do exist.

`scout.index(name)` builds a small handle each time it is called, because a
handle holds no state. Keep it in a constant if you call it on every render.

Two indexes over two different engines can live in one `Scout`. Nothing in the
core branches on an adapter name, so adding a provider is one new package and
zero changes here.

## The schema

`schema` is any [Standard Schema](https://standardschema.dev) validator: Zod,
Valibot, ArkType or your own object with a `~standard` member. It does two jobs.

At compile time, Scout reads the document type out of it. That is where
`hit.document`, the filter operators available per field, and the facet value
types all come from.

At runtime, every hit is validated before it becomes a `SearchHit`. The
validator is the only thing that turns a provider's `unknown` into the type you
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

Two hits with the same id are preserved rather than deduplicated or rejected.
Scout only ever sees one page, so a duplicate is an index or an `id` problem,
and failing a live search over it would be worse than rendering it. The
conformance suite asserts that order and count survive. De-duplication across
pages belongs to the consumer, and `flattenHits` in the TanStack package does
it; see [recipes](recipes.md).

## Filterable, facetable and highlightable

Each of the three lists may only name keys of the document, and each one decides
what a search can ask for:

- `filterable` builds the field objects a `where` callback receives. A field
  outside this list does not exist on that object, and the operators a field
  does have come from its type in the schema. See [filters](filters.md).
- `facetable` is what `.facets(...)` accepts, and the value type of each facet
  comes from the schema field. See [facets](facets.md).
- `highlightable` is what `.highlight(...)` accepts. See
  [highlights](highlights.md).

They are declarations about your application, not about the engine. Whether the
engine can serve them is the adapter's business, and an adapter that cannot
throws rather than answering a narrower search. An empty list is fine:
`facetable: []` says this index has no faceted UI.

Declaring a field here does not configure the engine. A Typesense collection
still needs the field marked `facet: true`, a Meilisearch index still needs it
in `filterableAttributes`, and an Orama schema still needs the right property
kind. Scout has no indexing or admin API, so the engine side stays yours.

## Sorts and profiles

```ts
sorts: ["relevance", "priceAsc"],
profiles: ["default", "autocomplete"],
```

Both are non-empty tuples of names your application uses, and the first entry of
each is the default a new search starts with. The adapter configuration is
constrained to cover every declared name, so a provider swap that forgets one
fails in the adapter configuration rather than at a call site.
[Profiles and sorts](profiles-and-sorts.md) explains why the names live here.

## Invalid documents

```ts
index({ ...definition, validate: "skip" });
```

`validate` decides what happens when a hit fails the schema:

- `"error"`, the default, rejects the whole search with a
  `SearchValidationError` carrying the validator's own messages on `issues`.
- `"skip"` drops the offending hits and reports how many on `result.skipped`.
  That number matters: dropping a hit changes what the page contains, so a page
  of twenty with `skipped: 3` really returned seventeen.

There is no third mode. Skipping validation entirely would hand your own `id()`
an unchecked value and make the document type a claim that nothing checks.

## Empty queries

```ts
index({ ...definition, emptyQuery: "allow" });
```

By default an empty query is refused with a `SearchValidationError` before
anything is sent. What an engine does with empty text differs between engines,
and turning `""` into a wildcard would be a silent transformation. Whitespace is
never trimmed into one either.

Set `emptyQuery: "allow"` when the engine behind this index does something
useful with empty text and you want it. Otherwise, skip the search while the
input is empty, which is what the `enabled` option in
[TanStack Query](tanstack-query.md) is for.

## Disposal

```ts
scout.dispose();
```

Disposal is synchronous, idempotent and cascades to every index adapter. A
search already in flight rejects with a `SearchDisposedError` when it answers,
so a disposed index cannot produce results. Provider clients you injected are
left alone, because Scout borrowed them and does not own their lifetime.

Dispose on a security context change rather than reusing an instance across
accounts. See [security](security.md).
