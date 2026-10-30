# @priemskiyyy/scout-typesense

The [Typesense](https://typesense.org/) adapter for
[Scout](https://priemskiyyy.github.io/scout/). It translates one portable
search request onto one Typesense collection and maps the answer back, and it
does nothing else.

```sh
pnpm add @priemskiyyy/scout@next @priemskiyyy/scout-typesense@next typesense
```

`typesense` is a peer dependency and the client is yours. This package imports
no Typesense SDK, not even its types, so one build serves the browser, Node and
React Native. `src/typesense.contracts.ts` pins its structural types to the
real ones.

## Use

```ts
import { index, Scout } from "@priemskiyyy/scout";
import { typesense } from "@priemskiyyy/scout-typesense";
import { SearchClient } from "typesense";

const client = new SearchClient({
  nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
  apiKey: searchOnlyKey,
});

const products = index({
  schema: ProductSchema,
  id: (product) => product.id,
  searchable: ["name", "brand"],
  filterable: ["brand", "price", "inStock"],
  facetable: { brand: "string", price: "number", inStock: "boolean" },
  highlightable: ["name"],
  sorts: { priceAsc: { price: "asc" } },
  profiles: { exact: { searchable: ["name"] } },
});

const scout = new Scout({
  indexes: { products },
  adapters: {
    products: typesense({
      client,
      collection: "products",
      profiles: { exact: { prefix: false } },
    }),
  },
});
```

The index says what a search can do, and the adapter only says how Typesense
does it:

- `client` is a `Client` or `SearchClient` the application built. The adapter
  never closes it, and `scout.index("products").native` hands it back.
- `collection` is the collection to search. It is also the fingerprint, so it
  takes part in every query key. An API key never does.
- `profiles` tunes the index's profiles, keyed by profile name. `prefix`
  decides whether the last token may match a prefix, which Typesense does by
  default. The fields a profile searches come from the index.

Parameters Scout does not write pass through `.provider()`, typed as
`TypesenseSearchOptions`:

```ts
scout.index("products").search("shoe").provider({ num_typos: 1 });
```

## What it translates

- **Query.** The query goes to `q` and the profile's fields to `query_by`. An
  empty query browses, sent as Typesense's `*`.
- **Filters.** The normalised filter becomes one `filter_by` string. Equality
  is exact `:=`, never the token matching `:`, so a filter on `red` cannot also
  return `dark red`. String values are backtick quoted, with a backtick and a
  backslash escaped inside one. Every group is parenthesised, and a negation is
  pushed down to the fields, because Typesense negates a field and never a
  group.
- **Sorts.** A sort becomes `sort_by`, such as `price:asc,name:desc`, and
  relevance sends none. Typesense sorts a string field only when the collection
  schema marks it `sort: true`.
- **Pages.** Typesense pages are one based like Scout's, so nothing is shifted.
- **Totals.** `found` is exact, or estimated when `search_cutoff` says the
  engine stopped early. Paging reaches every match, so the scope is `matches`.
- **Facets.** `facet_by` asks for them, and `facet_counts[].sampled` becomes
  the facet's exhaustiveness. Typesense reports every value as a string, and
  Scout reads it back as the type the index declared.
- **Highlights.** Typesense wraps a match in markers, and the adapter makes new
  ones for every search, so no document can be written to contain them. The
  marked text is split into matched and unmatched parts, a part never carries
  markup, and an array field says which element matched. `value` is the whole
  field; a `snippet` is a window whose truncation Typesense does not report.
- **Cancellation.** The signal reaches the SDK's `abortSignal`, so an aborted
  search stops on the wire.
- **Time.** `search_time_ms` is the engine's own `took`.

`hit.native` keeps the whole Typesense hit, `text_match` among it, and
`result.native` keeps the whole response.

## What it refuses

With `unsupported-feature`, before anything is sent:

- A page larger than 250, which Typesense rejects.
- A sort by more than three fields, which is Typesense's limit.
- A grouped search. `group_by` answers with `grouped_hits`, a result shape
  Scout does not map, and a preset that turns grouping on is refused when the
  answer arrives. Ask for one through the native client.

With `configuration`, from Scout itself before the adapter sees the search, a
provider option the adapter writes: `q`, `query_by`, `prefix`, `filter_by`,
`sort_by`, `facet_by`, `page`, `per_page`, `highlight_fields`,
`highlight_start_tag` and `highlight_end_tag`. A filter's values need no check
here: each operator's value is typed, and Scout refuses `NaN` and infinite
numbers.

## Tests

The adapter runs the shared conformance suite from `@priemskiyyy/scout/testing`
against an in-process fake of the client, which evaluates the query and the
page but not `filter_by` or `sort_by`, so the suite checks those translate and
the adapter's own tests pin the strings they translate to.
`src/typesense.contracts.ts` pins the fake and the structural client to the
real `typesense` 3.0.6 types. `src/typesense.backend.test.ts` runs the same
suite against a real Typesense 30.2 server started from its official image,
where filters, sorts and pages are checked on the documents it returned. Run it
with `pnpm test:backends typesense`, which needs Docker.

MIT
