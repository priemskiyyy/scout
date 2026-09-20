---
description: "What each Scout error means, why it was thrown before anything was sent, and the fix for the symptoms that come up most often."
---

# Troubleshooting

Every Scout failure is an `Error` subclass carrying a `code` from a closed
union, so one handler can cover all of them.

```ts
import { ScoutError } from "@priemskiyyy/scout";

try {
  await products.search(text).facets("brand").execute();
} catch (error) {
  if (!(error instanceof ScoutError)) {
    throw error;
  }
  if (error.code === "unsupported-feature") {
    // This adapter cannot do it. Nothing was sent.
    return renderWithoutFacets();
  }
  if (error.code === "validation") {
    return reportSchemaDrift(error);
  }
  throw error;
}
```

The codes are `"validation"`, `"unsupported-feature"`, `"provider"`,
`"aborted"`, `"disposed"` and `"configuration"`. Each one also has a subclass,
so `error instanceof UnsupportedSearchFeatureError` narrows at a call site where
that reads better.

## UnsupportedSearchFeatureError

**What you see.** A rejected search with `adapter` and `feature` on the error,
and no network request at all.

**Why.** The adapter declares what it actually implements, and the core checks
the request against that declaration before dispatch. A feature the adapter does
not have is refused rather than dropped, and never emulated by filtering or
sorting the page that came back, because a silently narrower search returns
results that look right and are not.

The ones that come up:

| `feature`                | Adapter                                                     | What to do                                                             |
| ------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| `facets.resultScoped`    | MiniSearch                                                  | MiniSearch has no facet index. Use Orama locally, or drop the facet.   |
| `highlights`             | Orama, MiniSearch                                           | Neither reports match offsets. Render the plain field.                 |
| `pagination.maxPageSize` | Typesense 250, Algolia 1000, Meilisearch its `maxTotalHits` | Ask for a smaller page.                                                |
| `sorts.<name>`           | MiniSearch                                                  | It orders by relevance only; map your sort names to `"relevance"`.     |
| `filters.field.<name>`   | Orama                                                       | Orama matches a `string` property by token. Declare it `enum`.         |
| `facets.<name>`          | Orama                                                       | A `number` property is counted into ranges the portable request lacks. |

The message names the adapter and the feature. See [adapters](adapters.md) for
the full capability table and [filters](filters.md) for the Orama rule.

## SearchValidationError

**What you see.** A rejected search with `index` and `issues`, where `issues`
carries the validator's own messages.

**Why.** Either a document did not match the index schema, or the query was
empty and the index declares `emptyQuery: "reject"`, which is the default.

For a schema mismatch, fix the schema if the index really holds that shape. If
some documents are legitimately incomplete, set `validate: "skip"` on the index:
invalid hits are dropped and `result.skipped` reports how many, which matters
because dropping a hit changes what the page contains. There is no mode that
skips validation and still claims the document type, because the validator is
the only thing that produces it.

For an empty query, skip the search while the input is empty, with
`enabled: text.length > 0` in TanStack Query, or declare
`emptyQuery: "allow"` on the index if the engine and profile do something useful
with empty text. Whitespace is never trimmed into a wildcard.

One more source: a validator that answers with a promise is a validation
failure, not something Scout awaits. Validation is synchronous, because a page
of fifty hits would otherwise await fifty times.

## SearchConfigurationError

**What you see.** A throw carrying `path`, usually before any await resolves.

**Why.** A programming mistake Scout can see without asking the engine:

- an index name that was never declared, where the message lists the names that
  were;
- a `.provider()` key the adapter reserves, where `path` is
  `provider.<key>`, listed per adapter in [native access](native-access.md);
- a value with no canonical form anywhere in the query identity: a function, a
  symbol, `undefined`, `NaN`, an infinite number, an invalid `Date` or an
  instance of a class. The message names the path. Replace it with plain data,
  or move what it stands for into the adapter's fingerprint.

## SearchAbortedError

**What you see.** A rejected search carrying `adapter` and `cancellation`.

**Why.** The signal passed to `execute({ signal })` fired, which with TanStack
Query happens on unmount and on a superseded query.

`cancellation: "transport"`, on Typesense and Meilisearch, means the provider
request was really cancelled. `cancellation: "logical"`, on Algolia, Orama and
MiniSearch, means Scout stopped waiting and refused the late answer while the
engine kept working. On Algolia that query is still computed and still billed.
This is not a bug to fix, it is what the capability records.

## SearchDisposedError

**What you see.** A rejected search carrying `index`, either immediately or when
a search that was already in flight answers.

**Why.** `scout.dispose()` was called. Disposal is idempotent and cascades to
every adapter, and it deliberately refuses a late answer so results computed
under a previous security context cannot be rendered. If this fires during
normal use, something is disposing the instance too eagerly, for example in a
React effect cleanup that runs on every render. See [security](security.md) for
when disposal is the right move.

## SearchProviderError

**What you see.** A rejected search carrying `adapter`, with the engine's own
error on `cause`.

**Why.** The provider rejected the request or failed to answer. Scout adds
nothing to the message that could carry a credential and never flattens the
original into it, so read `error.cause` for the stack and the engine's own
message. A timeout, an auth failure or an unknown field name arrives this way.

## Results are stale after the local corpus changed

**Symptom.** Orama or MiniSearch keeps answering with documents that are no
longer in the index, or misses ones that are.

**Why.** Scout does not watch your database. Nothing in Scout reads it, hooks it
or compares it. A local corpus is part of what the answer depends on and is not
part of the request, so the adapter folds the application's own `revision()` into
its fingerprint and therefore into the query key.

Bump the revision whenever the corpus changes: after an insert, an update, a
removal, a `load()` of a serialised index or a rebuild. Any value that changes
will do. Forgetting to bump it means TanStack Query keeps answering from the old
corpus; bumping it too often only costs cache hits, which is the cheaper
mistake.

## An Algolia invalidation never reaches the network

**Symptom.** `queryClient.invalidateQueries` refetches, and the same stale
response comes back.

**Why.** The Algolia client has its own `requestsCache` and `responsesCache`, and
`searchSingleIndex` marks every search cacheable in a way a per request option
cannot undo. The adapter therefore calls `searchSingleIndexWithHTTPInfo` by
default, which is the only search call path that consults neither cache.

If you see this, something passed `cache: true` to the adapter, which opts back
into the client's caches on purpose. Remove it, or accept that TanStack Query is
no longer the only cache in the path.

## Duplicate keys in an infinite list

**Symptom.** React warns about two children with the same key, or a virtualised
list renders a row twice, and only past page one.

**Why.** Page number pagination over an index that changed between fetches. Page
two returns the tail of page one.

Flatten with `flattenHits`, which de-duplicates by `hit.id` with the first
occurrence keeping its place. See [recipes](recipes.md) and
[TanStack Query](tanstack-query.md).

## Two searches share a cache entry, or fail to

**Symptom.** Changing something re-runs the query when it should not, or does
not when it should.

**Why.** The query key is the canonical identity of the search. Ordering inside
`in()` does not change it, an empty `in([])` normalises to a constant, nested
`and` groups flatten, and requesting the same facet twice is de-duplicated. Page
size is part of the identity; the page number is part of a normal query's
identity and is the page parameter for an infinite one.

What is in a key and what is not is listed in
[query identity](internals/query-identity.md). If two searches that should
differ share a key, check whether the difference lives somewhere Scout cannot
see, such as a mutable object read inside the adapter, or a local corpus whose
revision did not change.
