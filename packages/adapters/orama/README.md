# @priemskiyyy/scout-orama

Orama adapter for [Scout](https://priemskiyyy.github.io/scout/). Orama runs in
the process that searches it, so this adapter answers a Scout search without a
network round trip, in a browser, in a React Native app or on a server.

It translates the portable keyword subset and nothing else. Vector, hybrid and
embedding search are not reached from here.

```sh
pnpm add @priemskiyyy/scout-orama @priemskiyyy/scout @orama/orama
```

## Wiring it up

The database and Orama's `search` are injected, so this package imports no
Orama code at runtime and cannot disagree with the version you installed.

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
  filterable: ["brand", "price", "inStock"],
  facetable: ["brand", "inStock"],
  highlightable: [],
  sorts: ["relevance", "priceAsc"],
  profiles: ["default", "names"],
  adapter: orama({
    db,
    search,
    revision: () => revision,
    profiles: {
      default: {},
      names: { properties: ["name"] },
    },
    sorts: {
      relevance: {},
      priceAsc: { sortBy: { property: "price", order: "ASC" } },
    },
  }),
});

const scout = new Scout({ indexes: { products } });
```

A profile carries the knobs that change which documents match or in what order:
`properties`, `boost`, `tolerance` and `threshold`. A sort carries Orama's own
`sortBy`, and a sort without one keeps Orama's relevance order.

## The corpus revision

A remote engine changes behind an HTTP request, so a cache eventually notices.
A local corpus changes in the same process, with nothing in between to notice
it. **Scout does not watch your database.** Nothing in Scout reads it, hooks it
or compares it.

So the application owns a revision, and the adapter folds it into the query
identity through its fingerprint:

```ts
let revision = 0;

const bump = () => {
  revision += 1;
};

insert(db, product);
bump();
```

Bump it whenever the corpus changes: after an insert, an update, a removal, a
`load()` of a serialised index or a rebuild. Any value that changes will do, and
a counter is the easiest one. Scout puts it in every query key for this index,
so a cached query for the old corpus and the same query for the new one are two
different queries.

Forget to bump it and TanStack Query keeps answering from the old corpus until
something else invalidates it. Bump it more often than needed and you lose
cache hits, which is the cheap mistake of the two.

The revision must not be a credential. It takes part in query identity, so it
reaches cache keys and devtools.

## Aborting does not stop the work

Orama runs to completion in the process that called it, and it takes no
`AbortSignal`. The adapter declares `cancellation: "logical"`: aborting a search
makes Scout refuse the answer, and the search itself still runs to the end.
There is no cancellation path to add here, only the honest label.

## What is translated, and what is refused

Orama filters a property by the kind its schema declares. An `enum`, `number` or
`boolean` property is matched by value. A `string` property is matched by
**token**: `where: { brand: "Acme Audio" }` matches every document whose brand
contains `acme` or `audio`, which is not what `eq` means anywhere else in Scout.

So a portable filter is translated for the kinds Orama matches by value, and
refused with `UnsupportedSearchFeatureError` for the rest. Declare a field you
mean to filter exactly as `enum`, not as `string`.

| Filter                   | `number` | `enum`  | `boolean` | `string`, `string[]`, `enum[]`, `number[]`, `geopoint` |
| ------------------------ | -------- | ------- | --------- | ------------------------------------------------------ |
| `eq`                     | yes      | yes     | yes       | refused                                                |
| `neq`                    | yes      | yes     | yes       | refused                                                |
| `in`, `notIn`            | yes      | yes     | yes       | refused                                                |
| `gt`, `gte`, `lt`, `lte` | yes      | refused | refused   | refused                                                |
| `between`                | yes      | refused | refused   | refused                                                |

`and`, `or` and `not` are supported at any depth, because Orama's `where` takes
them as a tree. `neq` and `notIn` are the complement of the matching set, so a
document that does not hold the property at all is part of the answer.

Nothing is ever filtered or sorted in JavaScript over a returned page. A filter
this adapter cannot express throws before the search runs.

## Totals, pages, facets and highlights

- **Totals** are exact. Orama counts every match, so a total is
  `accuracy: "exact"` with `scope: "matches"`, and whether another page exists
  is known rather than guessed.
- **Pages** are Scout's one-based pages translated into Orama's `limit` and
  `offset`. There is no maximum page size.
- **Facets** are reported for `enum`, `boolean` and `string` properties.
  `exhaustive` is `true` when Orama returned every distinct value it counted and
  `false` when it truncated the list to its own limit, which it does for
  `string` properties past ten values. A facet on a `number` property is
  refused: Orama counts one into ranges, and the portable facet request carries
  no ranges to give it.
- **Highlights** are declared `"none"`. Orama's keyword search reports no match
  offsets, so there is nothing to build `HighlightPart` values from, and
  inventing them from a tokenizer this package cannot see would be fabricating
  them. Every hit carries an empty highlight record, and asking an index for a
  highlight through this adapter throws.

## Native access

`hit.native` is Orama's own `Result`, including its `score`. The whole Orama
response is on `result.native`, including `count`, `elapsed` and `facets`.

This adapter takes no provider options: its native option type is `never`, so
`.provider()` cannot be called on an Orama backed index at all. Everything Orama
exposes per search, such as `boost`, `tolerance` and `threshold`, belongs to a
named profile instead. Reach the database directly through `index.native` for
anything Scout does not model, remembering that a direct call bypasses Scout's
identity, capability checks and result mapping, and therefore any cache built on
them.
`took` is Orama's own `elapsed.raw`, converted from nanoseconds to
milliseconds.

## Verification

The tests run against a real `@orama/orama` database holding real documents,
because the engine is in process and there is nothing to stand in for. There is
no fake.
