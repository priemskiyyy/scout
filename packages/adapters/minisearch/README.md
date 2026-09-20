# @priemskiyyy/scout-minisearch

[MiniSearch](https://lucaong.github.io/minisearch/) adapter for
[Scout](../../core). Requires `minisearch` 7.

MiniSearch is a full text index that lives in your process, so this adapter
implements less of the portable contract than the remote ones do. That is the
point. Everything MiniSearch cannot answer is declared unsupported and refused
before the search runs, rather than emulated over the page that happened to come
back. A search that asks for a facet, an order other than relevance or a
highlight throws `UnsupportedSearchFeatureError`. It never comes back quietly
narrower.

What it does declare is real. MiniSearch returns every match, so the total is
exact over all matches and a page is a slice of the whole result array, and its
`filter` option runs over every match rather than over one page, so the portable
filter AST translates into it without narrowing a count that was already
reported.

## Installation

```sh
pnpm add @priemskiyyy/scout @priemskiyyy/scout-minisearch minisearch
```

The MiniSearch instance is injected, so this package imports no SDK at runtime.
`src/minisearch.contracts.ts` pins the structural types to the real ones.

## Create an index

```ts
import { index, Scout } from "@priemskiyyy/scout";
import { minisearch } from "@priemskiyyy/scout-minisearch";
import MiniSearch from "minisearch";
import { type Product, products, ProductSchema } from "./catalogue";

let catalogueVersion = 1;

const catalogue = new MiniSearch<Product>({
  fields: ["title", "category", "tags"],
  storeFields: ["id", "title", "category", "price", "tags"],
});
catalogue.addAll(products);

const scout = new Scout({
  indexes: {
    products: index({
      schema: ProductSchema,
      id: (product) => product.id,
      filterable: ["category", "price", "tags"],
      facetable: [],
      highlightable: [],
      sorts: ["relevance"],
      profiles: ["default"],
      adapter: minisearch({
        index: catalogue,
        revision: () => catalogueVersion,
        profiles: {
          default: { fields: ["title", "category", "tags"], prefix: true },
        },
        sorts: { relevance: "relevance" },
      }),
    }),
  },
});

const result = await scout
  .index("products")
  .search("boot")
  .where((field) => field.category.eq("footwear"))
  .execute();
```

## Stored fields are not the document

A MiniSearch result carries the document id, the score, the match report and
only the fields listed in `storeFields`. That is usually not the whole
application document, and Scout validates the whole document against the index
schema, so this adapter needs to be told which of the two situations it is in.

**Every schema field is stored.** Leave `resolve` off. The document Scout
validates is the result's stored fields plus MiniSearch's `id`. If the instance
stored nothing at all, the adapter throws a `SearchConfigurationError` naming
`storeFields` and `resolve`, so the failure arrives as the configuration mistake
it is instead of as a schema error listing every missing field.

**Only some schema fields are stored.** Pass `resolve`, and the adapter builds
the document from the id and the stored record. It runs before validation, so
what it returns is what the schema sees.

```ts
minisearch({
  index: catalogue,
  revision: () => catalogueVersion,
  resolve: (id) => documentsById.get(String(id)),
  profiles: { default: { fields: ["title"] } },
  sorts: { relevance: "relevance" },
});
```

Use `resolve` as well when the schema's id field is not named `id`, because the
adapter cannot see your schema and writes MiniSearch's `id` under that name.

A filter reads the same document a hit will carry. With a resolver that means
the resolver runs for every match a filtered query considers, not only for the
page, so keep it to a lookup.

## What it can and cannot do

| Capability                | Declared         | Why                                                                                                             |
| ------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `filters.*`               | every one `true` | MiniSearch's `filter` is a predicate over every match, so this is real filtering and not page scoped emulation. |
| `pagination.page`         | `true`           | A page is a slice of the full result array.                                                                     |
| `pagination.maxPageSize`  | `null`           | The corpus is already in memory, so no page size is refused.                                                    |
| `facets.resultScoped`     | `false`          | MiniSearch has no facet index.                                                                                  |
| `facets.excludeOwnFilter` | `false`          | There are no facets to exclude a filter from.                                                                   |
| `facets.searchValues`     | `false`          | There are no facet values to search.                                                                            |
| `highlights`              | `"none"`         | MiniSearch reports which fields a term hit, never where in the text.                                            |
| `cancellation`            | `"logical"`      | The search runs to completion in process.                                                                       |

### Filtering is real, and here is why

MiniSearch's `filter` option takes a predicate and calls it for each candidate
result while it is still assembling them, before anything is returned. It sees
every match, not one page. So translating Scout's filter AST into a predicate
narrows the set MiniSearch itself counted: the total stays exact, page two is
still the real page two, and a filtered search is not a page of an unfiltered
one. That is what makes `eq`, `neq`, `in`, `notIn`, the comparisons, `between`
and boolean composition all honest `true`.

The predicate evaluates against the same document the hit will carry, so a
filter sees exactly what your application sees. A field that is neither stored
nor produced by `resolve` is absent, and an absent field matches nothing and
falls inside no range, which is how the remote engines answer for the same
document. A repeated field answers an operator when any element answers it, the
way `tags.eq("sale")` reads everywhere else in Scout.

A contradiction is answered without asking the engine at all.

### Facets are refused, not scanned

MiniSearch has no facet index and no facet option. Counts could only be produced
by materialising every match on every query and tallying it, which is a full
scan that stays invisible until the corpus grows. Counting the returned page
instead would be worse: the numbers would be wrong in a way nobody can see.
`facets.resultScoped` is `false`, so Scout refuses a faceted search here and the
application finds out at once. If you need facets over a local corpus, the Orama
adapter has them.

### Only relevance

MiniSearch orders by BM25 score and takes no sort option. Every sort name you
declare therefore maps to `"relevance"`, and it may be an alias:
`sorts: { best: "relevance" }` lets an index declare `best` and get score order.
A request for any other sort name throws `UnsupportedSearchFeatureError`. Sorting
another way would mean ordering every match on every query, the same hidden full
scan that rules facets out. A second order belongs in a second MiniSearch
instance, or in the application.

### No highlights

MiniSearch's `match` maps each matched term to the fields it was found in. It
carries no offsets, and the tokenizer and term processor that would be needed to
find them again are the instance's and are not exposed. Parts built from that
would be guesses, so `highlights` is `"none"` and every hit's highlight record is
empty. Scout refuses a search that asks for highlights rather than returning
fabricated ones.

### Aborting does not stop the work

`cancellation` is `"logical"`. MiniSearch is synchronous and in process: by the
time an abort can be observed the search has already run to completion. Aborting
stops Scout waiting and makes the core refuse the late answer, which is what
`"logical"` promises. It does not stop, interrupt or shorten the search itself.

### Totals and pages

MiniSearch returns every match, so the total is `accuracy: "exact"` with
`scope: "matches"` and `next` is never `"unknown"`. Pages are one based and
sliced from the full array. `took` is `null`, because MiniSearch reports no
timing of its own and the core measures the call rather than being handed a
number this adapter invented.

### Empty queries

MiniSearch finds nothing for an empty query string. `emptyQuery` is an index
option, not a profile one, so an index either allows an empty query for all its
profiles or rejects it for all of them. Leave it at the default `"reject"` and
skip the search while the input is empty, with TanStack's `skipToken` or an
ordinary guard.

## The corpus revision

A local index is part of what an answer depends on and is not part of the
request, so `revision` joins the adapter's fingerprint and therefore the query
identity. Return a new value whenever the corpus changes, and a rebuilt index
produces new cache keys instead of serving an answer computed from the corpus it
replaced.

```ts
let catalogueVersion = 1;

const adapter = minisearch({
  index: catalogue,
  revision: () => catalogueVersion,
  profiles: { default: { fields: ["title"] } },
  sorts: { relevance: "relevance" },
});

catalogue.addAll(newArrivals);
catalogueVersion += 1;
```

## Native access

`hit.native` is the raw MiniSearch result, including `score` and `match`, and
`result.native` is the full result array before pagination. Native search
options go through `.provider()` and are merged over the profile. `filter` is
reserved, because Scout owns filtering through its AST and a second predicate
would be invisible to the query identity.

## License

[MIT](LICENSE)
