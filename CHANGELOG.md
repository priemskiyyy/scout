# Changelog

## @priemskiyyy/scout 0.1.0 - 2026-10-30

- First release. One `Scout` per application over named `indexes`, each served by one of its `adapters`, and reached with `scout.index(name)`. An index without an adapter, an adapter without an index, and an adapter that serves sorts through its own configuration but misses one are refused at compile time and when the Scout is built.
- `index()` declares the portable contract and names no engine: the Standard Schema for its documents, the fields a search reads, filters, facets and highlights, facet value types, named sorts as fields and directions, and named profiles as the fields they search. "relevance" and "default" are built in.
- An immutable search builder with a typed filter AST. Operators follow each field's schema type, an empty query browses, and `page({ current, size })` moves and resizes a page, keeping what it leaves out.
- One `ScoutError` with a `code`: `configuration`, `unsupported-feature`, `validation`, `provider`, `aborted` or `disposed`. `execute()` rejects with it and never throws synchronously.
- The core owns what every adapter would otherwise repeat: name resolution, filter normalisation, the answer to a filter that matches nothing, cancellation and disposal that settle a search even when an engine never answers, error wrapping, page derivation and facet value decoding.
- Canonical query identity through `builder.key()`, including the adapter fingerprint, so two searches that mean the same thing share a cache entry and two that differ in anything that changes results do not.
- Results preserve uncertainty. A total is exact, estimated, a lower bound or unknown, a facet says whether it was exhaustive, and nothing fabricates a count or a page.
- Highlights are safe text parts rather than trusted HTML, and malformed highlight metadata degrades to plain text.
- An adapter is a plain object. It lists the provider options it writes itself as `reservedOptions`, and the core refuses a search that passes one. `@priemskiyyy/scout/adapter` has the helpers adapters build on, `@priemskiyyy/scout/mock` a controllable adapter for tests, and `@priemskiyyy/scout/testing` the conformance suite every adapter runs through a real `Scout`.

## @priemskiyyy/scout-tanstack-query 0.1.0 - 2026-10-30

- First release. `queryOptions` and `infiniteQueryOptions` turn one search into plain TanStack Query options, so they drop into `useQuery`, `useInfiniteQuery`, `prefetchQuery` or `ensureQueryData` and can be spread over.
- The query key is the search's canonical identity, and the `signal` TanStack supplies reaches `execute`, so cancellation reaches the engine rather than only the cache.
- An infinite query keys on the search at page one with an `"infinite"` segment, so the page number stays a page parameter and never joins the key.
- A next page of `"unknown"`, which the core only reports for a page that came back full, advances the list.
- `flattenHits` returns one de-duplicated list keyed on `hit.id`, because page numbered pagination repeats a hit whenever the corpus shifts between two fetches.
- No caching, staleness or retry default is set here. Those belong to the application.
- Requires `@priemskiyyy/scout` 0.1.

## @priemskiyyy/scout-typesense 0.1.0 - 2026-10-30

- First release. One Typesense collection behind the portable contract: an exact `filter_by` with its own escaping, `sort_by` from the index's sorts, `*` for a browse, one based pages, and per search highlight markers parsed into safe parts.
- A total is `"estimated"` when Typesense reports `search_cutoff`, and exact otherwise. A sampled facet is not exhaustive.
- Refuses a page over 250, a sort by more than three fields, a grouped search, and a provider option Scout writes itself.
- The client is injected, so this package imports no SDK at runtime, and the signal reaches it.
- Requires `@priemskiyyy/scout` 0.1 and `typesense` 3.

## @priemskiyyy/scout-algolia 0.1.0 - Unreleased

- First release. Sorts are served by replicas, keyed by the index's sort names and checked against them at compile time and when the Scout is built.
- Totals follow `exhaustive.nbHits`, and the pages end at `paginationLimitedTo` while the total still counts every match.
- Refuses a page over 1000, the filters Algolia's boolean grammar rejects, and a provider option or profile parameter Scout writes itself.
- The client's own caches are bypassed unless `cache: true`, and highlight markers cannot be forged by a document.
- The client is injected, so this package imports no SDK at runtime. The Algolia client takes no signal, so an aborted search settles at once but may still run.
- Requires `@priemskiyyy/scout` 0.1 and `algoliasearch` 5.

## @priemskiyyy/scout-meilisearch 0.1.0 - 2026-10-30

- First release. One Meilisearch index behind the portable contract, with `attributesToSearchOn` from the profile, `sort` from the index's sorts, one based pages in either page or offset mode, and safe highlight parts from per search markers.
- A total that reaches the index's `maxTotalHits` is a lower bound of what paging can reach, and offset mode's estimate is reported as estimated.
- Refuses a page larger than `maxTotalHits` and a provider option Scout writes itself.
- The index client is injected, so this package imports no SDK at runtime, and the signal reaches it.
- Requires `@priemskiyyy/scout` 0.1 and `meilisearch` 0.50 or newer.

## @priemskiyyy/scout-mongodb 0.1.0 - 2026-10-30

- First release. One collection behind the portable contract through its MongoDB Search index. Each search is one aggregation pipeline: `$search` first, the query as `text` over the profile's fields, the filter as `compound` clauses that do not score, sorts in the stage's `sort`, and `$skip` and `$limit` pages.
- Totals, facets and highlights arrive on every row. A `lowerBound` count above 1000 is reported as a lower bound, and `exactTotals` asks for an exact count. Facets are not known to be exhaustive, and highlights arrive as parts, so there are no markers to forge.
- Refuses a string filter or facet on a field not listed in `tokens`, number and boolean facets, a set mixing value types, and any provider option Scout writes itself.
- The collection is injected, so the package imports no driver at runtime, and the signal reaches `aggregate`.
- Requires `@priemskiyyy/scout` 0.1 and `mongodb` 7.

## @priemskiyyy/scout-elasticsearch 0.1.0 - 2026-10-30

- First release. One Elasticsearch index behind the portable contract: the filter as a JSON `bool` query, sorts, facets as terms aggregations, per search highlight markers parsed into safe parts, and pages that end at `max_result_window`, reported as `retrievable`.
- `keywords` names the exact field beside a text field, so equality, facets and sorts never compare analysed tokens.
- A total is a lower bound when Elasticsearch stopped counting, timed out or lost a shard. A facet is exhaustive only when nothing was left out or undercounted.
- Refuses a page past `max_result_window` and a provider option Scout writes itself.
- The client is injected, so this package imports no SDK at runtime, and the signal reaches it.
- Requires `@priemskiyyy/scout` 0.1 and `@elastic/elasticsearch` 9.

## @priemskiyyy/scout-opensearch 0.1.0 - 2026-10-30

- First release. The same translation over one OpenSearch index. The body goes under `body`, and `result.native` is the answer body without the transport's headers and meta.
- The client takes no signal, so an abort calls `abort()` on the request it returned and the search stops on the wire.
- Refuses a page past `max_result_window` and a provider option Scout writes itself.
- The client is injected, so this package imports no SDK at runtime.
- Requires `@priemskiyyy/scout` 0.1 and `@opensearch-project/opensearch` 3.

## @priemskiyyy/scout-orama 0.1.0 - 2026-10-30

- First release. Answers a search from an in process Orama database, with no network round trip, in a browser, in React Native or on a server.
- Exact totals, real pagination, sorts by one field, and facets for `enum`, `boolean` and `string` properties with Orama's own truncation reported as `exhaustive`.
- A filter is translated only for the property kinds Orama matches by value, so `eq` means the same thing here as everywhere else in Scout. Highlights, number facets and sorts by several fields are refused.
- The application owns a corpus `revision` that joins the query identity, since nothing watches a local database.
- Requires `@priemskiyyy/scout` 0.1 and `@orama/orama` 3.

## @priemskiyyy/scout-http 0.1.0 - 2026-10-30

- First release. Search your own backend through your own client: `http({ fingerprint, request })`. `request({ search, signal })` sends the portable search, whose `JSON.stringify` is its wire form, with the address, authentication, headers and retries your client already owns, and resolves with the backend's JSON body.
- `request` resolves with the answer typed as a `ScoutWireResponse`, which your client owns the way it owns the address, and validates first if its backend is untrusted. A `{ "refusal": { "message" } }` answer reaches the caller as `unsupported-feature`, and anything that fails otherwise is a `provider` error.
- A backend can say how far paging reaches with `retrievable`.
- No SDK and no runtime dependency.

## @priemskiyyy/scout-minisearch 0.1.0 - 2026-10-30

- First release. An in process MiniSearch index behind the portable contract, with exact totals over every match.
- Filtering is real: the portable filter becomes MiniSearch's own predicate, which runs over every match, and sorts run over the whole match set before a page is cut.
- An empty query browses through the `wildcard` option, from minisearch 7.2. Facets and highlights are refused rather than emulated.
- A `resolve` hook builds the document when `storeFields` does not hold every schema field, and the application owns a corpus `revision` that joins the query identity.
- Requires `@priemskiyyy/scout` 0.1 and `minisearch` 7.

## @priemskiyyy/scout-fuse 0.1.0 - 2026-10-30

- First release. An injected Fuse.js 7.5 instance with portable filters and sorts over the complete match set and exact pagination.
- A profile over fewer keys than Fuse indexes becomes a Fuse logical query, and is refused where extended or token search cannot run one.
- Safe highlights from inclusive match ranges, including array paths and Unicode text. Facets are refused.
- Zero runtime dependencies; requires `@priemskiyyy/scout` 0.1 and Fuse.js 7.5.
