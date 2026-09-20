# Changelog

## @priemskiyyy/scout 0.1.0 - 2026-09-20

- First release. One `Scout` per application over named indexes, reached with `scout.index(name)`.
- `index()` declares the portable contract: the Standard Schema for its documents, its filterable, facetable and highlightable fields, and its sort and profile names. An adapter must cover every declared sort and profile, so swapping a provider fails in the adapter configuration rather than at a consumer call site.
- An immutable search builder with a typed filter AST, so a builder can be stored, shared and rebuilt on every keystroke without anything reaching back into it.
- Canonical query identity through `searchKey`, including the adapter fingerprint, so two searches that mean the same thing share a cache entry and two that differ in anything that changes results do not.
- Capability checks before dispatch. Portable behaviour an adapter cannot translate throws `UnsupportedSearchFeatureError` instead of being dropped or emulated over one returned page.
- Results preserve uncertainty. A total is exact, estimated, a lower bound or unknown, a facet says whether it was exhaustive, and nothing fabricates a count.
- Highlights are safe text parts rather than trusted HTML, and malformed highlight metadata degrades to plain text.
- `createSearchAdapter` infers native types and configured names, with optional cleanup and reserved option keys. It settles aborted or disposed searches even when a provider never answers.
- `@priemskiyyy/scout/mock` for tests without a provider, and `@priemskiyyy/scout/testing` for the conformance suite every adapter runs.
- Numeric and boolean facet labels are decoded consistently by remote adapters. Malformed configured values reject.
- Builder inputs are snapshotted, cyclic key inputs reject clearly, and empty responses cannot claim an absent native payload.
- Core capability checks walk filters once without an intermediate operator set. Validation preserves Standard Schema results until public error mapping.
- Prototype-named fields remain ordinary result keys. Malformed membership operands and asynchronous schemas reject without silent coercion or unhandled rejections.

## @priemskiyyy/scout-tanstack-query 0.1.0 - 2026-09-20

- First release. `queryOptions` and `infiniteQueryOptions` turn one search into plain TanStack Query options, so they drop into `useQuery`, `useInfiniteQuery`, `prefetchQuery` or `ensureQueryData` and can be spread over.
- The query key is the search's canonical identity, and the `signal` TanStack supplies reaches `execute`, so cancellation reaches the provider rather than only the cache.
- An infinite query keys on the search at page one with an `"infinite"` segment, so the page number stays a page parameter and never joins the key.
- `page.next` of `"unknown"` advances only while the provider page came back full, including documents skipped by validation.
- `flattenHits` returns one de-duplicated list keyed on `hit.id`, because page numbered pagination repeats a hit whenever the corpus shifts between two fetches.
- No caching, staleness or retry default is set here. Those belong to the application.
- Requires `@priemskiyyy/scout` 0.1.

## @priemskiyyy/scout-typesense 0.1.0 - 2026-09-20

- First release. Translates the portable contract onto one Typesense collection: `filter_by` with its own escaping, one based pages, facet counts with Typesense's own sampling reported as `exhaustive`, and marker highlights parsed into safe parts.
- A total is `"estimated"` when Typesense reports `search_cutoff`, and exact otherwise.
- `cancellation: "transport"`, because Typesense accepts an `AbortSignal`.
- The client is injected, so this package imports no SDK at runtime.
- Requires `@priemskiyyy/scout` 0.1 and `typesense` 3.

## @priemskiyyy/scout-algolia 0.1.0 - 2026-09-20

- First release. Named sorts resolve to replica index names, because Algolia sorts with replicas rather than a per request parameter.
- Totals stay honest under `paginationLimitedTo`: matches past the window are counted but reported as unreachable rather than pretended to be pages.
- Highlight markers are parsed into parts that cannot be forged by document content, and every filter value is escaped before it is sent.
- `cancellation: "logical"`, because the Algolia client carries no request signal.
- The client is injected, so this package imports no SDK at runtime.
- Requires `@priemskiyyy/scout` 0.1 and `algoliasearch` 5.

## @priemskiyyy/scout-meilisearch 0.1.0 - 2026-09-20

- First release. Filter translation, one based pages in either page or offset mode, and safe highlight parts from Meilisearch's markers.
- A total that reaches the index's `maxTotalHits` is reported as a lower bound rather than as a count, and offset mode's estimate is reported as estimated.
- `cancellation: "transport"`, because Meilisearch passes a `signal` through to fetch.
- The index client is injected, so this package imports no SDK at runtime.
- Requires `@priemskiyyy/scout` 0.1 and `meilisearch` 0.50 or newer.

## @priemskiyyy/scout-orama 0.1.0 - 2026-09-20

- First release. Answers a search from an in process Orama database, with no network round trip, in a browser, in React Native or on a server.
- Exact totals, real pagination, and facets for `enum`, `boolean` and `string` properties with Orama's own truncation reported as `exhaustive`.
- A filter is translated only for the property kinds Orama matches by value, and refused for the kinds it matches by token, so `eq` means the same thing here as everywhere else in Scout.
- Highlights are declared `"none"`, because Orama's keyword search reports no match offsets.
- The application owns a corpus `revision` that joins the query identity, since nothing watches a local database.
- Requires `@priemskiyyy/scout` 0.1 and `@orama/orama` 3.

## @priemskiyyy/scout-http 0.1.0 - 2026-09-20

- First release. Puts a JSON search endpoint you own behind the portable contract, with no SDK and no runtime dependency.
- It owns the plumbing every HTTP backend needs identically: `fetch`, the abort signal, a refused response as a `SearchProviderError` carrying the status and a slice of the body, a body that is not JSON named as such, and the empty answer for a filter that matches nothing.
- It decides nothing about your wire format. The application supplies `toRequest`, `fromResponse` and its own capabilities, because only it knows what its backend can do. That capability record is the one in the family nothing verifies; run `testSearchAdapter` against your endpoint to check yourself.
- `scoutWireRequest` and `scoutWireResponse` are an opt in format for anyone who controls both ends, which puts a whole adapter at about twenty lines. `scoutWireResponse` decodes rather than trusts, and names the field when a body is malformed.
- The fingerprint is the endpoint with userinfo and the query string removed, so a credential cannot reach a cache key, devtools or a log.

## @priemskiyyy/scout-minisearch 0.1.0 - 2026-09-20

- First release. An in process MiniSearch index behind the portable contract, with exact totals over every match and pages sliced from the full result array.
- Filtering is real: the portable AST becomes MiniSearch's own predicate, which runs over every match rather than over one returned page.
- Facets, sorts other than relevance and highlights are declared unsupported and refused before the search runs, rather than emulated with a hidden full scan or invented from the page that came back.
- The instance is injected and a `resolve` hook builds the document when `storeFields` does not hold every schema field.
- The application owns a corpus `revision` that joins the query identity.
- Requires `@priemskiyyy/scout` 0.1 and `minisearch` 7.

## @priemskiyyy/scout-fuse 0.1.0 - Unreleased

- Injected Fuse.js 7.5 instance with portable filters over the complete match set and exact pagination.
- Safe highlights from inclusive match ranges, including array paths and Unicode text.
- Named sorts and profiles alias the injected configuration. Facets are unsupported.
- Zero runtime dependencies; requires Scout 0.1 and Fuse.js 7.5.
