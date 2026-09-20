---
description: "Fuse.js fuzzy search with portable filters, exact pagination and safe highlights."
---

# Fuse.js

| Scout              | Fuse.js mapping                                                   |
| ------------------ | ----------------------------------------------------------------- |
| Query              | `index.search(query)` over the injected instance                  |
| Filters            | Evaluate the portable AST over every match, before pagination     |
| Pages and total    | Slice the complete filtered result set; exact match count         |
| Sorts and profiles | Named aliases for the instance's configured search and order      |
| Highlights         | Inclusive match ranges become safe text parts                     |
| Facets             | Unsupported; Fuse has no facet index                              |
| Cancellation       | Logical; synchronous Fuse work runs to completion                 |
| Identity           | Corpus revision; change it when documents or configuration change |

```ts
import Fuse from "fuse.js";
import { index, Scout } from "@priemskiyyy/scout";
import { fuse } from "@priemskiyyy/scout-fuse";

const engine = new Fuse(catalogue, {
  keys: ["name", "description"],
  threshold: 0.3,
  includeMatches: true,
  includeScore: true,
});
const scout = new Scout({
  indexes: {
    products: index({
      schema: ProductSchema,
      id: (product) => product.id,
      filterable: ["price", "brand"],
      facetable: [],
      highlightable: ["name"],
      sorts: ["relevance"],
      profiles: ["default"],
      adapter: fuse({
        index: engine,
        revision: () => catalogueVersion,
        sorts: { relevance: null },
        profiles: { default: null },
      }),
    }),
  },
});
const products = scout.index("products");
const result = await products
  .search("hedphones")
  .where((product) => product.price.lte(200))
  .highlight("name")
  .pageSize(10)
  .execute();
```

Fuse is injected and never imported by the adapter. The real engine is used in
the unit and conformance suites. `hit.native` preserves `score`, `matches` and
`refIndex`; `result.native` preserves the complete Fuse answer.

```ts
const controller = new AbortController();
try {
  await products.search("shoe").execute({ signal: controller.signal });
} finally {
  scout.dispose(); // The borrowed Fuse instance remains usable.
}
```

Enable `includeMatches` when constructing Fuse to request highlights. Without
it, Scout refuses `.highlight()` rather than inventing offsets. Malformed
ranges degrade to plain text. Array matches retain their element path.

Fuse's only per-call option is a result limit. Scout owns that concern through
pagination, so this adapter accepts no `.provider()` options. Configure matching
and ordering on the injected instance. Named sorts and profiles are aliases for
that configuration; they do not mutate the engine between requests. With
`shouldSort: false`, Fuse preserves collection order.

An empty query has Fuse 7.5's native meaning: the whole corpus in collection
order. Scout rejects empty queries unless the index sets `emptyQuery: "allow"`.

See [the official Fuse documentation](https://www.fusejs.io/getting-started.html)
for engine configuration. Keep input debouncing and caching in the application.
