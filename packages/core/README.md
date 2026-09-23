# @priemskiyyy/scout

**Typed, provider-independent search for TypeScript.**

The runtime: typed indexes, an immutable search builder, a portable filter AST,
deterministic query identity, honest pagination and a small adapter contract.
Zero runtime dependencies.

Pair it with an adapter (`@priemskiyyy/scout-typesense`, `-algolia`,
`-meilisearch`, `-orama`, `-minisearch`, `-fuse`, `-http`) and, if you want
caching, `@priemskiyyy/scout-tanstack-query`.

```sh
pnpm add @priemskiyyy/scout @priemskiyyy/scout-typesense
```

```ts
import { Scout, index } from "@priemskiyyy/scout";
import { typesense } from "@priemskiyyy/scout-typesense";

const products = index({
  schema: ProductSchema,
  id: (product) => product.id,
  searchable: ["name", "brand"],
  filterable: ["brand", "price", "inStock"],
  facetable: { brand: "string" },
  highlightable: ["name"],
  sorts: { priceAsc: { price: "asc" } },
});

const scout = new Scout({
  indexes: { products },
  adapters: { products: typesense({ client, collection: "products" }) },
});

const result = await scout
  .index("products")
  .search("wireless headphones")
  .where((product) => product.price.lte(300))
  .sort("priceAsc")
  .facets("brand")
  .execute();
```

`product.price.lte(300)` exists because `price` is a number and was declared
filterable. `.sort("priceDesc")` does not, because the index never declared it.
The index names no engine, so the same declaration runs on any adapter.

## What the core owns

- **The builder.** Immutable, so a stored search cannot be changed by a later
  one. Nothing is sent until `execute()`, and an empty query browses.
- **The filter AST and its normalisation.** Empty groups collapse, nested groups
  flatten, an empty `in` matches nothing, an empty `notIn` restricts nothing,
  and set operands are sorted and de-duplicated. A filter that can match
  nothing is answered without asking the engine.
- **Query identity.** `search.key()` is deterministic and drops straight into a
  cache key. A value with no canonical form is refused rather than silently
  dropped, and a credential never reaches it.
- **The lifecycle.** Cancellation, disposal and error wrapping are the core's,
  so a search settles on abort or disposal whatever the engine does.
- **The result.** Documents validated against the schema, facet values decoded
  to their declared types, and the page derived from the total and the hits.
- **The uncertainty model.** A total is `exact`, `estimated`, `lower-bound` or
  `unknown`, and a facet says whether it was exhaustive. Scout never fabricates
  a count or a page total.
- **Safe highlights.** `{ text, matched }` parts, never markup.

## What it does not own

Caching, staleness, retries, request deduplication, infinite page storage,
debouncing and refetching. TanStack Query is already good at those and Scout
sets none of their defaults.

## Subpaths

| Import                       | What it is                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `@priemskiyyy/scout`         | the runtime and its types                                                        |
| `@priemskiyyy/scout/adapter` | `createHighlightMarkers`, `splitHighlight` and `matchesFilter`, for adapters     |
| `@priemskiyyy/scout/mock`    | `createMockSearchAdapter`, deliberately badly behaved, for testing your own code |
| `@priemskiyyy/scout/testing` | `testSearchAdapter`, the conformance suite every adapter runs                    |

`vitest` is an optional peer, needed only by the testing subpath.

## Errors

Every failure is a `ScoutError` with a `code`: `"configuration"`,
`"unsupported-feature"`, `"validation"`, `"provider"`, `"aborted"` or
`"disposed"`. An engine that cannot express part of a search refuses it with
`"unsupported-feature"` before anything is sent, and never answers a narrower
search. An engine's own error is preserved on `cause`.

`execute()` rejects rather than returning an error value, because it feeds
TanStack Query, which only enters its error state when the query function
rejects.

Documentation: https://priemskiyyy.github.io/scout/

MIT licensed.
