---
description: "Fuse.js fuzzy search with portable filters and sorts, exact pagination and safe highlights."
---

# Fuse.js

| Scout       | Fuse.js mapping                                                        |
| ----------- | ---------------------------------------------------------------------- |
| Query       | `index.search(query)` over the injected instance                       |
| Empty query | Fuse's own browse: every document, in collection order                 |
| Profiles    | Every indexed key is Fuse's own search; fewer is a `$or` logical query |
| Filters     | The portable filter, evaluated over every match before paging          |
| Sorts       | The declared fields, sorted over every match before paging             |
| Total       | Exact: the whole filtered match set is counted                         |
| Highlights  | Inclusive match ranges from `includeMatches` become safe text parts    |
| Facets      | Refused: Fuse has no facet index                                       |
| Identity    | The corpus revision; change it when documents or configuration change  |

```ts
import Fuse from "fuse.js";
import { index, Scout } from "@priemskiyyy/scout";
import { fuse } from "@priemskiyyy/scout-fuse";

const products = index({
  schema: ProductSchema,
  id: (product) => product.id,
  searchable: ["name", "description"],
  filterable: ["price", "brand"],
  highlightable: ["name"],
  sorts: { priceAsc: { price: "asc" } },
  profiles: { names: { searchable: ["name"] } },
});

const engine = new Fuse(catalogue, {
  keys: ["name", "description"],
  threshold: 0.3,
  includeMatches: true,
  includeScore: true,
});

const scout = new Scout({
  indexes: { products },
  adapters: {
    products: fuse({ index: engine, revision: () => catalogueVersion }),
  },
});

const result = await scout
  .index("products")
  .search("hedphones")
  .where((product) => product.price.lte(200))
  .sort("priceAsc")
  .highlight("name")
  .page({ size: 10 })
  .execute();
```

## Options

- `index`: the Fuse instance the application owns. Scout never changes its
  configuration, and disposing Scout leaves it usable.
- `revision`: what versions the corpus. It becomes the fingerprint, so change
  it whenever the documents or the Fuse configuration change.

Fuse's only option per search is a result limit, and pages are Scout's, so the
adapter takes no `.provider()` options. Configure matching on the instance.

## Profiles

Fuse's keys are fixed when it is built. A profile that searches every indexed
key is Fuse's own search. One that searches fewer becomes a logical query,
`{ $or: [{ name: query }] }`, which scores each key the way a plain search
does. Every field a profile searches must be a Fuse key.

## Refusals

Each is a `ScoutError`, raised before Fuse is asked anything.

- A facet is `unsupported-feature`: Fuse has no facet index.
- A highlight is `unsupported-feature` when Fuse was built without
  `includeMatches`, rather than an invented range.
- A profile over fewer keys than Fuse indexes is `unsupported-feature` with
  `useTokenSearch` on, whose logical queries lack the corpus statistics token
  search needs, or with `useExtendedSearch` on, where `!term` would read per
  key instead of across them.
- A profile searching a field Fuse does not index is `configuration`.

## Results

`hit.native` keeps Fuse's `score`, `matches` and `refIndex`, and
`result.native` keeps its whole answer, before filtering. With
`shouldSort: false` the relevance order is collection order. Sorting compares
numbers numerically and strings by code unit, puts a document without the
field last in either direction, and keeps Fuse's order for a tie.

Malformed ranges, and ranges that would cut a surrogate pair, degrade to the
field's own text. An array field keeps the element index in its path.

## Tests

The adapter's tests and the conformance suite run against the real fuse.js
7.5 engine over a real corpus, so the conformance suite checks which documents
came back. Each helper in `src/utils/` is also tested on its own, with a Fuse
answer written by hand where that pins an edge Fuse would not produce, such as
a malformed range. `fuse.contracts.ts` pins the structural types to fuse.js's
own.

See [the official Fuse documentation](https://www.fusejs.io/getting-started.html)
for engine configuration. Keep input debouncing and caching in the
application.
