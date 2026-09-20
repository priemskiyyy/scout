# @priemskiyyy/scout-typesense

The Typesense adapter for [Scout](https://priemskiyyy.github.io/scout/). It
translates one portable search request onto one Typesense collection and maps
the answer back, and it does nothing else.

```sh
pnpm add @priemskiyyy/scout-typesense typesense
```

`typesense` is a peer dependency and the client is yours. This package imports
no Typesense SDK, not even its types, so one build serves the browser, Node and
React Native.

## Use

```ts
import { Client } from "typesense";
import { index } from "@priemskiyyy/scout";
import { typesense } from "@priemskiyyy/scout-typesense";

const client = new Client({
  nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
  apiKey: process.env.TYPESENSE_SEARCH_KEY,
});

const products = index({
  schema: productSchema,
  id: (product) => product.id,
  filterable: ["brand", "price", "inStock"],
  facetable: ["brand", "price", "inStock"],
  highlightable: ["name"],
  sorts: ["relevance", "priceAsc"],
  profiles: ["default"],
  adapter: typesense({
    client,
    collection: "products",
    profiles: { default: { queryBy: ["name", "brand"], prefix: true } },
    sorts: { relevance: {}, priceAsc: { sortBy: "price:asc" } },
    facets: { price: "number", inStock: "boolean" },
  }),
});
```

Every sort and profile the index declares has to appear in `sorts` and
`profiles`, so dropping one while swapping a provider is a compile error in the
configuration rather than a surprise at a call site.

`facets` says how to read a facet value. Typesense reports every facet value as
a string, even for a numeric field, and only you know what the field really is.
A field left out stays the string Typesense sent.

## What it translates

- **Filters.** The normalised filter tree becomes one `filter_by` string.
  Equality is exact `:=` and never the token matching `:`, so a filter on `red`
  cannot also return `dark red`. String values are backtick quoted, with a
  backtick and a backslash inside one escaped. `and`, `or` and `not` are
  parenthesised group by group, and a negation is pushed down to the fields
  because Typesense negates a field and never a group. A filter that cannot
  match answers with an empty page without asking the engine.
- **Pagination.** Typesense pages are one based like Scout's, so nothing is
  shifted. `per_page` is capped at 250, which the capabilities declare, so an
  oversized page is refused before it is sent.
- **Totals.** `found` is exact, or estimated when `search_cutoff` says the
  engine stopped early. The scope is always `matches`.
- **Facets.** `facet_counts[].sampled` becomes the facet's exhaustiveness, and
  a sampled facet is reported as not exhaustive.
- **Highlights.** Typesense wraps a match in markers rather than reporting
  offsets, so the snippet is parsed into alternating matched and unmatched
  parts. A part never carries markup, an array field reports which element
  matched, and a snippet that does not read as balanced markers degrades to one
  unmatched part of plain text.
- **Cancellation.** The signal is passed to the SDK's `abortSignal`, so the
  adapter declares `cancellation: "transport"`.
- **Time.** `search_time_ms` is reported as the engine's own `took`.

`hit.native` keeps the whole Typesense hit, `text_match` among it, and
`result.native` keeps the whole response.

## What it refuses

- A grouped search. `group_by` answers with `grouped_hits` instead of `hits`,
  which is a different result shape than the portable contract maps. Ask for one
  through the client directly.
- A filter value that is not a string, a number or a boolean, and a range
  comparison against a string. Converting either would be the adapter guessing
  an encoding that belongs to the application.
- A provider option that collides with a field Scout owns: `q`, `query_by`,
  `prefix`, `filter_by`, `sort_by`, `facet_by`, `page`, `per_page`,
  `highlight_fields`, `highlight_start_tag`, `highlight_end_tag` and `group_by`.

## Verification

The adapter runs the shared conformance suite from `@priemskiyyy/scout/testing`
against an in-process fake of the client shape, and `src/typesense.contracts.ts`
pins that fake and the structural client to the real `typesense` 3.0.6 types.
See `docs/verification.md` for what is covered by a fake and what is covered by
a real backend.

MIT
