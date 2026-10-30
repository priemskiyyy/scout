# @priemskiyyy/scout-orama

The Orama adapter for [Scout](https://priemskiyyy.github.io/scout/). Orama runs
in the process that searches it, so a Scout search costs no network round trip,
in a browser, in a React Native app or on a server.

It translates the portable keyword subset and nothing else. Vector, hybrid and
embedding search are not reached from here.

```sh
pnpm add @priemskiyyy/scout-orama@next @priemskiyyy/scout@next @orama/orama
```

The database and Orama's `search` are injected, so this package imports no
Orama code at runtime and cannot disagree with the version you installed.

## Use

```ts
import { create, insert, search } from "@orama/orama";
import { index, Scout } from "@priemskiyyy/scout";
import { orama } from "@priemskiyyy/scout-orama";

const db = create({
  schema: {
    name: "string",
    description: "string",
    brand: "enum",
    price: "number",
    inStock: "boolean",
  },
});

let revision = 0;

const products = index({
  schema: ProductSchema,
  id: (product) => product.id,
  searchable: ["name", "description"],
  filterable: ["brand", "price", "inStock"],
  facetable: { brand: "string", inStock: "boolean" },
  sorts: { priceAsc: { price: "asc" } },
  profiles: { forgiving: { searchable: ["name"] } },
});

const scout = new Scout({
  indexes: { products },
  adapters: {
    products: orama({
      db,
      search,
      revision: () => revision,
      profiles: { forgiving: { tolerance: 2 } },
    }),
  },
});
```

## Options

- `db` is your database. The adapter reads its schema and never changes it.
- `search` is Orama's own `search` function, passed beside the database because
  Orama exports it as a function rather than as a method.
- `revision` is your corpus version, described below.
- `profiles` tunes the index's profiles, keyed by profile name, with Orama's
  `boost`, `tolerance` and `threshold`. The properties a profile searches come
  from the index.

The adapter takes no provider options. Everything Orama tunes per search
belongs to a profile, and a provider option passed from JavaScript is refused
with `configuration`.

## The corpus revision

A remote engine changes behind a request, so a cache eventually notices. A
local corpus changes in the same process, with nothing in between to notice it.
**Scout does not watch your database.**

So the application owns a revision, and the adapter puts it in every query key
for the index through its fingerprint. Bump it whenever the corpus changes:
after an insert, an update, a removal, a `load()` or a rebuild.

```ts
insert(db, product);
revision += 1;
```

Forget to bump it and TanStack Query keeps answering from the old corpus until
something else invalidates it. Bump it more often than needed and you lose
cache hits, the cheaper mistake. The revision reaches cache keys and devtools,
so it is never a credential.

## What it translates

- **Query.** The query is Orama's `term`, over the profile's fields as
  `properties`. An empty query browses: neither is sent, because Orama matches
  an empty term against the properties it is given, which would leave out a
  document with no token in them.
- **Filters.** Orama filters a property by the kind its schema declares. An
  `enum`, `number` or `boolean` property is matched by value, and a `string`
  property by **token**, so a filter on `Acme Audio` would also match `Acme`.
  A filter is translated for the kinds Orama matches by value. `and`, `or` and
  `not` keep their shape, because Orama's `where` is a tree. `neq` and `notIn`
  are the complement of the matching set, so a document without the property
  is in it.
- **Sorts.** A sort becomes Orama's `sortBy` on its one property.
- **Pages.** Scout's one-based page becomes Orama's `limit` and `offset`.
- **Totals.** Orama counts every match, so a total is exact.
- **Facets.** Orama counts every match, and keys each bucket by the value's
  string, which Scout reads back as the type the index declared.
  `exhaustive` is `false` when Orama truncated the list, which it does past
  ten values of a `string` property.
- **Time.** `took` is Orama's own `elapsed`, converted from nanoseconds.

`hit.native` is Orama's own result, `score` among it, and `result.native` is
the whole response.

## What it refuses

Each refusal is a `ScoutError`, thrown before Orama is searched.

| Asked for                                                                                        | Code                  |
| ------------------------------------------------------------------------------------------------ | --------------------- |
| A filter on a `string`, `string[]`, `enum[]`, `number[]`, `boolean[]` or `geopoint` property     | `unsupported-feature` |
| `gt`, `gte`, `lt`, `lte` or `between` on an `enum` or `boolean` property                         | `unsupported-feature` |
| A sort by more than one property, or on a property that is not a `number`, `string` or `boolean` | `unsupported-feature` |
| A facet on a `number` property, which Orama counts only into ranges                              | `unsupported-feature` |
| A highlight, because Orama's keyword search reports no match offsets                             | `unsupported-feature` |
| A filter or facet on a property the Orama schema does not declare                                | `configuration`       |
| A filter value the property cannot hold, such as `"199"` for a `number`                          | `configuration`       |
| A provider option                                                                                | `configuration`       |

Nothing is filtered or sorted in JavaScript over a returned page.

## Orama's own quirks

- A facet counts a document without the property under `""` for a `string` or
  `enum` property and under `false` for a `boolean` one.
- In Orama 3.1, a negated filter on a search with no query also returns a
  document removed with `remove()`, as a hit with an empty document, and counts
  it. Scout's schema check refuses such a hit, or drops it under
  `validate: "skip"`, but the total still counts it. Rebuild the database after
  removals if you browse with `neq`, `notIn` or `not`.

## Cancellation

Orama runs to completion in the process that called it, and it takes no
`AbortSignal`. Aborting makes Scout settle the search at once and refuse the
answer, and the search itself still runs to the end.

## Tests

The tests run against a real `@orama/orama` 3.1 database holding real
documents, because the engine is in process and there is nothing to stand in
for. The conformance suite runs over the same corpus and asserts which
documents came back. There is no fake. Each helper in `src/utils/` has its own
tests beside it.
