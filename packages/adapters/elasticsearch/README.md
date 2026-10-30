# @priemskiyyy/scout-elasticsearch

The [Elasticsearch](https://www.elastic.co/elasticsearch) adapter for
[Scout](https://priemskiyyy.github.io/scout/). It translates one portable
search request onto one Elasticsearch index and maps the answer back, and it
does nothing else.

```sh
pnpm add @priemskiyyy/scout@next @priemskiyyy/scout-elasticsearch@next @elastic/elasticsearch
```

`@elastic/elasticsearch` is a peer dependency and the client is yours. This
package imports no Elasticsearch SDK, not even its types.
`src/elasticsearch.contracts.ts` pins its structural types to the real ones.
The client runs on Node, so this adapter belongs on a server. A browser
reaches the same index through your own endpoint and
[`@priemskiyyy/scout-http`](https://priemskiyyy.github.io/scout/adapters.html#http-your-own-endpoint).

## Use

```ts
import { Client } from "@elastic/elasticsearch";
import { index, Scout } from "@priemskiyyy/scout";
import { elasticsearch } from "@priemskiyyy/scout-elasticsearch";

const client = new Client({ node, auth: { apiKey } });

const products = index({
  schema: ProductSchema,
  id: (product) => product.id,
  searchable: ["name", "brand"],
  filterable: ["brand", "price", "inStock"],
  facetable: { brand: "string", price: "number", inStock: "boolean" },
  highlightable: ["name"],
  sorts: { priceAsc: { price: "asc" } },
  profiles: { names: { searchable: ["name"] } },
});

const scout = new Scout({
  indexes: { products },
  adapters: {
    products: elasticsearch({
      client,
      index: "products",
      keywords: { brand: "brand.keyword" },
    }),
  },
});
```

The index says what a search can do, and the adapter only says how
Elasticsearch does it:

- `client` is a `Client` the application built. The adapter never closes it,
  and `scout.index("products").native` hands it back.
- `index` is the index, alias or pattern to search. It is also the
  fingerprint, so it takes part in every query key. An API key never does.
- `keywords` names the field holding a field's exact value, such as
  `brand.keyword` beside a `brand` mapped as `text`, which is what dynamic
  mapping gives every string. Filters, facets and sorts read it, because a
  `term` on a `text` field compares analysed tokens, so `Nimbus` finds nothing
  in `nimbus`, and Elasticsearch refuses to aggregate or sort one. A field not
  named here is used as it is named, and has to be mapped as `keyword`, a
  number or a boolean. The query itself always searches the fields as named.
- `trackTotalHits: true` counts every match rather than stopping at 10,000, at
  a cost in speed.
- `maxResultWindow` is the index's `max_result_window`, 10,000 unless you
  changed it.

Parameters Scout does not write pass through `.provider()`, typed as
`ElasticsearchSearchOptions`:

```ts
scout.index("products").search("shoe").provider({ min_score: 1.5 });
```

## What it translates

- **Query.** A `bool` query whose `must` is a `multi_match` of the query over
  the profile's fields. An empty query browses with `match_all`.
- **Filters.** The normalised filter becomes a JSON query in the `bool`'s
  `filter`, so it never changes a score, and the aggregations count the same
  documents the hits come from. Values travel as JSON, so none needs escaping.
  Equality is an exact `term` and a set is `terms`. A negation, `neq` and
  `notIn` are `must_not`, an or is `should` with `minimum_should_match: 1`,
  and a range is a `range` with `between` inclusive at both ends.
- **Sorts.** A sort becomes the `sort` array, one exact field after another,
  and relevance sends none.
- **Pages.** `from` is `(current - 1) * size`. Paging ends at
  `max_result_window`, which the adapter reports as `retrievable`, so the last
  page is the last one Elasticsearch will serve, while the total still counts
  every match.
- **Totals.** `hits.total` is exact when its relation is `eq` and a lower bound
  when it is `gte`, where Elasticsearch stopped counting. A search that hit its
  `timeout` or lost a shard answers with part of the index, so its total is a
  lower bound too.
- **Facets.** Each facet is a terms aggregation named for its field. It is
  exhaustive only when `sum_other_doc_count` and
  `doc_count_error_upper_bound` are both 0, `"unknown"` when Elasticsearch
  cannot bound the error, and never exhaustive on a partial answer. A boolean's
  key is 1 or 0, so its `key_as_string` is passed on, and Scout reads every
  value back as the type the index declared.
- **Highlights.** Elasticsearch wraps a match in `pre_tags` and `post_tags`,
  and the adapter makes new ones for every search, so no document can be
  written to contain them. `number_of_fragments: 0` asks for each value whole.
  The marked text is split into matched and unmatched parts, and a part never
  carries markup. A string field's fragment is the whole field; an array
  field's is one of its values, and which one is not reported.
- **Cancellation.** The signal reaches the client, so an aborted search stops
  on the wire.
- **Time.** `took` is the engine's own.

`hit.native` keeps the whole hit, `_id` and `_score` among it, and
`result.native` keeps the whole answer.

## What it refuses

With `unsupported-feature`, before anything is sent:

- A page that ends past `max_result_window`, which Elasticsearch rejects.

With `configuration`, from Scout itself before the adapter sees the search, a
provider option the adapter writes: `index`, `body`, `query`, `from`, `size`,
`sort`, `aggs`, `aggregations`, `highlight` and `track_total_hits`. A filter's
values need no check here: each operator's value is typed, and Scout refuses
`NaN` and infinite numbers.

With `provider`, from Elasticsearch: a sort or a facet on a `text` field that
`keywords` does not map to its exact field.

## Tests

The adapter runs the shared conformance suite from `@priemskiyyy/scout/testing`
against an in-process fake of the client. The fake evaluates what the adapter
sends: `bool`, `term`, `terms`, `range`, `match_all` and `multi_match` over a
near standard analyzer, sorts, pages, terms aggregations over every match, and
highlights of whole values, and like Elasticsearch it compares a `term` on a
`text` field with its tokens and refuses to sort or aggregate one. It says
nothing about relevance. `src/elasticsearch.contracts.ts` pins the fake and the
structural client to the real `@elastic/elasticsearch` 9.5.1 types.
`src/elasticsearch.backend.test.ts` runs the same suite against a real
Elasticsearch 9.5.3 server started from its official image, with the corpus
mapped as the fake maps it, where filters, sorts, pages, facets and highlights
are checked on the documents it returned. Run it with
`pnpm test:backends elasticsearch`, which needs Docker.

MIT
