# @priemskiyyy/scout-minisearch

The [MiniSearch](https://lucaong.github.io/minisearch/) adapter for
[Scout](https://priemskiyyy.github.io/scout/). It searches a MiniSearch
instance your application owns, in process, and does nothing else.

```sh
pnpm add @priemskiyyy/scout@next @priemskiyyy/scout-minisearch@next minisearch
```

`minisearch` 7 is a peer dependency and the instance is yours. This package
imports no MiniSearch SDK at runtime. `src/minisearch.contracts.ts` pins its
structural types to the real ones.

## Use

```ts
import { index, Scout } from "@priemskiyyy/scout";
import { minisearch } from "@priemskiyyy/scout-minisearch";
import MiniSearch from "minisearch";

const catalogue = new MiniSearch<Product>({
  fields: ["title", "category", "tags"],
  storeFields: ["id", "title", "category", "price", "tags"],
});

catalogue.addAll(documents);

let catalogueVersion = 1;

const products = index({
  schema: productSchema,
  id: (product) => product.id,
  searchable: ["title", "category", "tags"],
  filterable: ["category", "price", "tags"],
  sorts: { priceAsc: { price: "asc" } },
  profiles: { titles: { searchable: ["title"] } },
});

const scout = new Scout({
  indexes: { products },
  adapters: {
    products: minisearch({
      index: catalogue,
      wildcard: MiniSearch.wildcard,
      revision: () => catalogueVersion,
      profiles: { titles: { prefix: true, fuzzy: 0.2 } },
    }),
  },
});

const result = await scout
  .index("products")
  .search("shoe")
  .where((product) => product.category.eq("footwear"))
  .sort("priceAsc")
  .execute();
```

## Options

| Option     | What it is                                                                                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index`    | The MiniSearch instance. The adapter only calls `search` on it.                                                                                                                                 |
| `wildcard` | `MiniSearch.wildcard`, from minisearch 7.2. An empty query browses every document through it. The adapter imports no SDK, so it cannot name the symbol itself. Without it, browsing is refused. |
| `revision` | Returns a new value whenever the corpus changes. It joins the fingerprint, so a rebuilt index gets new cache keys instead of answers computed from the corpus it replaced.                      |
| `resolve`  | Builds the document from a result's id and stored fields. Required unless every schema field is stored.                                                                                         |
| `profiles` | MiniSearch tuning for the index's profiles, keyed by profile name: `prefix`, `fuzzy`, `maxFuzzy`, `boost`, `weights`, `combineWith` and `bm25`. The fields a profile searches are the index's.  |

A search's `.provider()` options are the same tuning, merged over the
profile's. `fields` and `filter` are written by Scout, so passing either is a
configuration error.

## Stored fields are not the document

A MiniSearch result carries the id, the score, the match report and only the
fields in `storeFields`, and Scout validates the whole document against the
index schema. When every schema field is stored, leave `resolve` off: the
document is the stored fields plus MiniSearch's `id`. When only some are, pass
`resolve` and build the document from the id. If the instance stores nothing
and there is no resolver, the search fails with a configuration error naming
both, rather than with a schema error listing every missing field.

Filters and sorts read the same document a hit carries, so a filterable or
sortable field must be stored or produced by `resolve`. The resolver runs for
every match a filtered or sorted search considers, so keep it to a lookup.

## What it does

MiniSearch answers with every match at once, and that is what makes the rest
honest:

- The filter runs as MiniSearch's `filter` predicate, over every match before
  anything is returned, so the total is the filtered count and page two is the
  real page two.
- A sort orders every match before the page is cut. Numbers and strings order
  by value, strings by code unit so the order is the same on every runtime. A
  missing value sorts last in either direction. `relevance` keeps MiniSearch's
  score order.
- The total is exact, and a page is a one based slice of the whole array.
- `took` is `null`, because MiniSearch reports no timing of its own.

## What it refuses

Each is refused with `unsupported-feature` before the index is searched.

- A facet. MiniSearch has no facet index, so counts could only come from
  tallying every match on every search.
- A highlight. MiniSearch reports which fields a term matched, never where in
  the text, so parts could only be guessed.
- An empty query without the `wildcard` option.

MiniSearch runs synchronously, so an abort cannot interrupt a search in
progress. The core stops waiting and refuses the late answer.

## Native access

`hit.native` is the raw MiniSearch result, including `score` and `match`.
`result.native` is the whole result array, before Scout sorted and paged it.

## Tests

The adapter runs the shared conformance suite from `@priemskiyyy/scout/testing`
against a real MiniSearch 7.2.0 instance over a small corpus, with the
semantic checks on, so filters, sorts and pages are checked against the
documents that come back. Everything runs in process, so there is no remote
backend left unverified.

## License

[MIT](LICENSE)
