---
description: "One-based pages, what page.next means when an engine will not commit, and how a total carries the accuracy the engine reported."
---

# Pagination

Pages are one-based, and every page of a result says what it is.

```ts
const result = await products.search("boots").page(2).pageSize(20).execute();

result.page;
// { kind: "page", current: 2, size: 20, next: 3, previous: 1 }
```

Without `.page()` the search asks for page 1. Without `.pageSize()` it asks for
20 hits. Both take part in the query identity, so two searches that differ only
in page size are two different searches.

## One-based everywhere

`page.current` is one-based in the portable contract and in the request an
adapter receives, whatever the engine underneath counts from. Algolia pages are
zero-based, so Scout page 1 is sent as Algolia page 0 and comes back as page 1.
Typesense and Meilisearch page mode are already one-based and are passed
through. Orama and MiniSearch take an offset, which the adapter computes as
`(page - 1) * pageSize`.

`page.size` is the page size the engine reported when it reported one, and the
requested size otherwise. `page.previous` is `current - 1` down to 1, then
`null`. Neither is inferred from the number of hits that came back.

## `page.next` is a number, `null`, or `"unknown"`

```ts
const next = result.page.next;
if (typeof next === "number") {
  // Another page exists and this is its number.
}
if (next === null) {
  // There is no page after this one.
}
if (next === "unknown") {
  // The engine did not say. Nothing here guesses on its behalf.
}
```

`"unknown"` is not a failure and not a placeholder for zero. It is an engine
that counted enough to answer this page and not enough to commit to the next
one. The alternatives are worse: claiming a next page that does not exist ends
the list on a request that returns nothing and looks like a bug, and claiming
there is none silently truncates results.

Which adapters can produce it:

| Adapter     | `next: "unknown"` happens when                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------- |
| Typesense   | `search_cutoff` cut the count short, so the page after the last counted one cannot be ruled out |
| Algolia     | the response carries no `nbPages`                                                               |
| Meilisearch | offset mode returned a full page, or page mode returned no `totalPages`                         |
| Orama       | never                                                                                           |
| MiniSearch  | never                                                                                           |

Orama and MiniSearch hold the whole corpus in process and count every match, so
whether another page exists is known rather than estimated.

[TanStack Query](tanstack-query.md) makes one documented choice about
`"unknown"` for infinite queries, and states what it costs.

## Page size has a ceiling, and it is checked before dispatch

`capabilities.pagination.maxPageSize` is what the engine accepts, and the core
checks it before the request leaves:

```ts
await products.search("boots").pageSize(500).execute();
// UnsupportedSearchFeatureError: The typesense adapter accepts at most 250
// results per page, and 500 were requested.
```

| Adapter     | `maxPageSize`                                      |
| ----------- | -------------------------------------------------- |
| Typesense   | 250                                                |
| Algolia     | 1000                                               |
| Meilisearch | the index's `maxTotalHits`, 1000 unless configured |
| Orama       | `null`, no limit                                   |
| MiniSearch  | `null`, no limit                                   |

`null` means the adapter declares no limit, not that any size is a good idea.
The check catches a page size the engine would reject; it says nothing about a
page size the engine will accept and then take a long time over.

Meilisearch will not paginate past `pagination.maxTotalHits`, so that number is
both its deepest reachable result and the largest page it can fill. Tell the
adapter what your index is set to, because it is an index setting and not
something the response reports:

```ts
meilisearch({ index, profiles, sorts, maxTotalHits: 5000 });
```

Algolia's `paginationLimitedTo` works the same way and is configured the same
way. Matches past that window exist but cannot be paged to, so the adapter caps
`page.next` at the last reachable page.

## A total says how sure it is

```ts
result.total;
// { value: 1249, accuracy: "estimated", scope: "matches" }
```

`SearchTotal` is a union, and the uncertain branch carries no number at all:

```ts
type SearchTotal =
  | {
      value: number;
      accuracy: "exact" | "estimated" | "lower-bound";
      scope: "matches" | "retrievable";
    }
  | { accuracy: "unknown"; scope: "matches" | "retrievable" | "unknown" };
```

So reading `result.total.value` without checking `accuracy` first is a compile
error, not a runtime surprise:

```ts
const label = (total: SearchTotal) => {
  if (total.accuracy === "unknown") {
    return "Many results";
  }
  if (total.accuracy === "exact") {
    return `${total.value} results`;
  }
  if (total.accuracy === "lower-bound") {
    return `${total.value}+ results`;
  }
  return `About ${total.value} results`;
};
```

### What each accuracy means

- `"exact"`: the engine counted every match.
- `"estimated"`: the engine said it approximated the count.
- `"lower-bound"`: the count stopped at a cap, so there are at least this many.
- `"unknown"`: the engine reported nothing to build a count from.

`scope` says what was counted. `"matches"` is every matching document.
`"retrievable"` is only the documents pagination can actually reach, which
differs whenever a provider limits pagination depth.

### Where each value comes from

| Adapter     | Mapping                                                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typesense   | `found`, with `search_cutoff: true` making it `"estimated"` and otherwise `"exact"`, always `scope: "matches"`                                                                    |
| Algolia     | `nbHits`, with `exhaustive.nbHits` deciding `"exact"` or `"estimated"` and a missing flag meaning `"unknown"`                                                                     |
| Meilisearch | page mode reads `totalHits`, exact below `maxTotalHits` and `"lower-bound"` with `scope: "retrievable"` at it; offset mode reads `estimatedTotalHits` and is always `"estimated"` |
| Orama       | `count`, exact over all matches                                                                                                                                                   |
| MiniSearch  | the length of the full result array, exact over all matches                                                                                                                       |

Algolia reports `scope: "retrievable"` while the count fits inside
`paginationLimitedTo` and `scope: "matches"` once it exceeds it, because past
that window the number is still a count of matches and calling it retrievable
would promise pages Algolia will not serve.

Meilisearch offset mode is `"estimated"` however small the number is. It is not
promoted to `"exact"` when it happens to look precise, because
`estimatedTotalHits` is documented as an estimate and a small estimate is still
an estimate.

Nothing in Scout computes a total from the hits it received, and nothing
computes a page count from a total. A page total the engine did not report is
absent, not zero.

## Why `took` is separate

```ts
result.took; // { milliseconds: 7, source: "provider" }
```

`source: "provider"` is the engine's own processing time, such as Typesense's
`search_time_ms`, Meilisearch's `processingTimeMs`, Algolia's
`processingTimeMS` or Orama's `elapsed`. `source: "scout"` is the wall time the
core measured around the call, which is what MiniSearch reports because it
reports no timing of its own. The two numbers mean different things: one
excludes the network and one includes it, so the field says which one you have
rather than blending them.

[Adapters](adapters.md) compares the engines side by side.
