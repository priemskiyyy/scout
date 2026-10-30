# @priemskiyyy/scout-mongodb

The [MongoDB Search](https://www.mongodb.com/docs/atlas/atlas-search/)
adapter, formerly Atlas Search, for [Scout](https://priemskiyyy.github.io/scout/).
It translates one portable search request into one aggregation pipeline over
one collection, `$search` first, and maps the rows back, and it does nothing
else.

```sh
pnpm add @priemskiyyy/scout@next @priemskiyyy/scout-mongodb@next mongodb
```

`mongodb` is a peer dependency and the client is yours. This package imports
no driver, not even its types, and `src/mongodb.contracts.ts` pins its
structural types to the real ones. The driver opens TCP connections, so a Scout
using this adapter runs on a server, and a browser reaches it through your own
endpoint, for example with `@priemskiyyy/scout-http`.

## Use

```ts
import { index, Scout } from "@priemskiyyy/scout";
import { mongodb } from "@priemskiyyy/scout-mongodb";
import { MongoClient } from "mongodb";

const client = new MongoClient(uri);

const products = index({
  schema: ProductSchema,
  id: (product) => String(product._id),
  searchable: ["name", "brand"],
  filterable: ["brand", "price", "inStock"],
  facetable: { brand: "string" },
  highlightable: ["name"],
  sorts: { priceAsc: { price: "asc" } },
  profiles: { names: { searchable: ["name"] } },
});

const scout = new Scout({
  indexes: { products },
  adapters: {
    products: mongodb({
      collection: client.db("shop").collection("products"),
      index: "products",
      tokens: ["brand"],
    }),
  },
});
```

The search index behind it maps each field for what the index declares: a
searched or highlighted field as `string`, a string you filter or facet on as
`token`, and a field that is both as both.

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": { "type": "string" },
      "brand": [{ "type": "string" }, { "type": "token" }],
      "price": { "type": "number" },
      "inStock": { "type": "boolean" }
    }
  }
}
```

The index says what a search can do, and the adapter only says how MongoDB
does it:

- `collection` is a `Collection` from a `MongoClient` the application
  connected. The adapter never connects or closes it, and
  `scout.index("products").native` hands it back.
- `index` is the search index's name, `"default"` unless given. With the
  namespace it is the fingerprint, such as `shop.products/products`, so it
  takes part in every query key. A connection string never does.
- `tokens` lists the fields the search index maps as `token`. MongoDB Search
  compares and facets a string only on such a field, so a string filter or
  facet on any other field is refused rather than sent.
- `exactTotals` asks for a count of every match instead of MongoDB's default,
  which is exact only up to 1000.

Options Scout does not write pass through `.provider()`, typed as
`MongoSearchOptions`:

```ts
scout.index("products").search("shoe").provider({ concurrent: true });
```

## What it translates

- **Query.** The query becomes a `text` operator over the profile's fields,
  the `must` clause of one `compound`. MongoDB Search has no operator for
  every document, so an empty query browses with an `exists` on each of those
  fields: every document holding one of them, which is every document a query
  could reach.
- **Filters.** The normalised filter becomes the compound's `filter` clause,
  so it narrows without scoring. Equality is `equals` and a set is `in`, both
  exact. A value is BSON data, never text to parse, so nothing is escaped and
  no value can change what a filter means. An `and` is a `filter` clause, an
  `or` a `should` with `minimumShouldMatch: 1`, and a range is `range`,
  inclusive at both ends for `between`. A negation is a compound of `mustNot`
  alone, which matches every other document, and the search's own clause
  keeps it to the documents a query or a browse can reach.
- **Sorts.** A sort becomes the stage's `sort`, `1` ascending and `-1`
  descending, and relevance sends none. MongoDB Search sorts a string only on
  a field mapped as `token`: a sort by any other string field comes back in an
  arbitrary order and without an error, and the adapter cannot tell a string
  field from a number, so map every string field a sort reads as `token`. A
  document missing the field comes first in ascending order.
- **Pages.** `$skip` and `$limit` follow `$search`, so paging reaches every
  match.
- **Totals.** Every row carries `$$SEARCH_META` under `__scout`, which the
  document handed to the schema leaves out. The default `lowerBound` count is
  exact up to 1000, and above it MongoDB answers 1001, which Scout reports as
  a `"lower-bound"`. `exactTotals: true`
  asks for a `total`, which is always exact. The count arrives on the rows, so
  a page past the last match has none, and its total is `"unknown"`.
- **Facets.** The `facet` collector wraps the operator with one string facet
  per field, read back from `$$SEARCH_META`. MongoDB Search returns its
  default of ten buckets a facet and never says whether it left values out, so
  `exhaustive` is `"unknown"`.
- **Highlights.** The stage's `highlight` names the fields, and
  `searchHighlights` comes back as passages already split into hits and the
  text around them, so there are no markers to forge and no markup to parse.
  MongoDB does not say whether a passage is the whole value, so `truncated` is
  `"unknown"`.
- **Cancellation.** The signal reaches `aggregate`, and the driver closes the
  cursor and rejects with the signal's reason. The driver marks the option
  experimental: an abort in the middle of a read closes the socket, so
  aborting hundreds of searches can empty its connection pool. Debounce search
  as you type.
- **Time.** MongoDB reports no search time, so `took` is `null` and Scout
  measures.

`hit.native` keeps the whole row, `__scout.score` among it, and
`result.native` keeps every row.

## What it refuses

With `unsupported-feature`, before anything is sent:

- A facet on a field not in `tokens`. That covers every number facet, which
  MongoDB counts only into boundaries the portable request does not carry, and
  every boolean facet, which MongoDB Search has no type for.
- A string equality or set on a field not in `tokens`.
- A set mixing value types, which `in` rejects.

With `configuration`, from Scout itself before the adapter sees the search, a
provider option the adapter writes: `index`, `compound`, `facet`, `count`,
`highlight` and `sort`.

## Tests

The adapter runs the shared conformance suite from `@priemskiyyy/scout/testing`
with `evaluates: true` against an in-process fake of the collection, which
evaluates the whole pipeline over a small corpus: the `text`, `exists`,
`equals`, `in`, `range` and `compound` operators, the count, string facets,
highlights, the sort, `$skip`, `$limit` and the `$set` that adds `__scout`. It
is strict where MongoDB is: it rejects a string compared on a field not mapped
as `token` and an option `$search` does not know, and a compound of `mustNot`
alone matches every other document. The adapter's own tests pin the pipeline
it sends. `src/mongodb.contracts.ts` pins the fake and the structural
collection to the real `mongodb` 7.6.0 types. The driver types every stage as
a plain document, so nothing in the driver checks the `$search` stage.

`src/mongodb.backend.test.ts` runs the same suite against MongoDB Search in the
`mongodb/mongodb-atlas-local` 8.3.11 image, so the engine itself checks the
pipeline, and the filters, sorts and pages are checked on the documents it
returned. Run it with `pnpm test:backends mongodb`, which needs Docker. Checked
by hand against the same image, and not pinned by a test: a `lowerBound` count
answers 1001 for 1500 matches, and `in` takes an integer and a double as one
number type but refuses strings beside numbers.

Not run: Atlas itself, a sharded cluster, and analyzers and relevance, which
the fake does not model either: it splits text on letters and digits and
lowercases it.

MIT
