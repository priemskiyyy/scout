---
description: "What each Scout error code means, when it is raised, and the fix for the symptoms that come up most often."
---

# Troubleshooting

Every failure Scout reports is one class, `ScoutError`, carrying a `code` from a
closed union, so one handler covers all of them.

```ts
import { ScoutError } from "@priemskiyyy/scout";

try {
  await products.search(text).facets("brand").execute();
} catch (error) {
  if (!(error instanceof ScoutError)) {
    throw error;
  }

  if (error.code === "unsupported-feature") {
    // This engine cannot do it. Nothing was sent.
    return renderWithoutFacets();
  }

  if (error.code === "validation") {
    return reportSchemaDrift(error);
  }

  throw error;
}
```

The codes are `"configuration"`, `"unsupported-feature"`, `"validation"`,
`"provider"`, `"aborted"` and `"disposed"`. The message says what happened in
words, and `cause` carries the original where there is one.

## `"unsupported-feature"`

**What you see.** A rejected search, and no request to the engine.

**Why.** The adapter's engine cannot express part of the search, so the adapter
refused it before sending anything. A feature an engine does not have is
refused rather than dropped, and never emulated by filtering or sorting the page
that came back, because a silently narrower search returns results that look
right and are not.

The ones that come up are facets or highlights on an engine that has none, a
page size above the engine's limit, a sort the engine cannot express, such as a
Typesense sort by more than three fields, and a filter the engine's grammar
cannot hold. The message names the limit. [Adapters](adapters.md) lists what
each engine refuses.

## `"configuration"`

**What you see.** A throw from `index()`, from `new Scout()`, from `.page()` or
`.where()` as you call them, from `key()`, or a rejected
`execute()`.

**Why.** A mistake Scout can see without asking the engine:

- a sort declared with no fields, such as `{}`;
- an index with no adapter, an adapter with no index, or adapter configuration
  for a sort or profile the index never declared, where the message says which;
- an index, sort, profile, facet, highlight or filter field that was never
  declared, where the message lists what was;
- a page or page size that is not a whole number above zero, or a `between`
  with its bounds the wrong way round;
- a provider option the adapter writes itself, where the message names it, see
  [native access](native-access.md);
- a value with no canonical form in a filter or a provider option: a function,
  a symbol, `undefined`, `NaN`, an infinite number, an invalid `Date`, an
  instance of a class or a circular reference. The message names the path.
  Replace it with plain data, or move what it stands for into the adapter's
  fingerprint.

The compiler catches most of these first. The runtime guard is for a
JavaScript caller and for a name read from a URL.

## `"validation"`

**What you see.** A rejected search whose message ends with what the schema
said, and the schema's issues on `cause`.

**Why.** A document the engine returned did not match the index schema.

Fix the schema if the index really holds that shape. If some documents are
legitimately incomplete, set `validate: "skip"` on the index: invalid hits are
dropped and `result.skipped` reports how many, which matters because dropping a
hit changes what the page contains. There is no mode that skips validation and
still claims the document type, because the validator is the only thing that
produces it.

One more source: a validator that answers with a promise is a validation
failure, not something Scout awaits. Validation is synchronous, because a page
of fifty hits would otherwise await fifty times.

## `"aborted"`

**What you see.** A rejected search whose `cause` is the abort reason.

**Why.** The signal passed to `execute({ signal })` fired, which with TanStack
Query happens on unmount and on a superseded query. The promise settles at once
whatever the engine is doing, and an answer that arrives afterwards is refused.
An engine whose SDK takes the signal cancels the request. One that does not
finishes the work, and on an engine that bills per query, still bills it. That
is not a bug to fix; [adapters](adapters.md) says which engines can cancel.

## `"disposed"`

**What you see.** A rejected search, either immediately or while it was in
flight.

**Why.** `scout.dispose()` was called. A search in flight settles at once and a
late answer is refused, so results computed under a previous security context
cannot be rendered. If this fires during normal use, something is disposing the
instance too eagerly, for example in a React effect cleanup that runs on every
render. See [security](security.md) for when disposal is the right move.

## `"provider"`

**What you see.** A rejected search naming the adapter and the index, with the
engine's own error on `cause`.

**Why.** The engine rejected the request or failed to answer, or it returned a
facet value that cannot be read as the type the index declared. Scout adds
nothing to the message that could carry a credential and never flattens the
original into it, so read `error.cause` for the stack and the engine's own
message. A timeout, an auth failure or an unknown field name arrives this way.

## Results are stale after the local corpus changed

**Symptom.** An in-process engine keeps answering with documents that are no
longer in the index, or misses ones that are.

**Why.** Scout does not watch your data. Nothing in Scout reads it, hooks it or
compares it. A local corpus is part of what the answer depends on and is not
part of the request, so the adapter folds the application's own `revision()` into
its fingerprint and therefore into the query key.

Bump the revision whenever the corpus changes: after an insert, an update, a
removal, a load of a serialised index or a rebuild. Any value that changes will
do. Forgetting to bump it means TanStack Query keeps answering from the old
corpus; bumping it too often only costs cache hits, which is the cheaper
mistake.

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
`in()` does not change it, nested `and` groups flatten, and requesting the same
facet twice is de-duplicated. Page size is part of the identity; the page number
is part of a normal query's identity and is the page parameter for an infinite
one.

What is in a key and what is not is listed in
[query identity](internals/query-identity.md). If two searches that should
differ share a key, check whether the difference lives somewhere Scout cannot
see, such as a mutable object read inside the adapter, or a local corpus whose
revision did not change.
