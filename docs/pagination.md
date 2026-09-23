---
description: "One-based pages derived by the core, what page.next means when an engine will not commit, and how a total carries the accuracy the engine reported."
---

# Pagination

Pages are one-based, and every result says which page it is.

```ts
const result = await products
  .search("boots")
  .page({ current: 2, size: 20 })
  .execute();

result.page;
// { current: 2, size: 20, next: 3, previous: 1 }
```

Without `.page()` the search asks for page 1 of 20 hits. A `.page()` call keeps
what it leaves out, so `.page({ current: 3 })` keeps the size. Both take part in
the query identity, so two searches that differ only in page size are two
different searches.

## One-based everywhere

`page.current` is one-based in the portable contract and in the request an
adapter receives, whatever the engine underneath counts from. Algolia pages are
zero-based, so the adapter sends Scout page 1 as Algolia page 0. Typesense is
already one-based. An engine that takes an offset gets `(current - 1) * size`.

## The core derives the page

An adapter reports hits and a total and nothing about pages. The core derives
`page` from what the request asked for, the total the engine reported, how many
hits came back, and, for an engine that stops paging before its total, how
many hits paging can reach. So no adapter computes it, and no two disagree
about what the same answer means.

`page.current` and `page.size` echo the request. `page.previous` is
`current - 1` down to 1, then `null`. `page.next` follows these rules, in
order:

1. A page that came back with fewer hits than its size is the last one: `null`.
2. A page that reaches where the engine stops paging is the last one, however
   many matches it counted: `null`. Algolia's `paginationLimitedTo` is such a
   limit.
3. A total with `accuracy: "unknown"` cannot say more: `"unknown"`.
4. An `"estimated"` total can run high or low, so it neither promises another
   page nor rules one out: `"unknown"`.
5. An exact total or a lower bound larger than every hit up to this page: the
   next page number, because at least that many documents match.
6. A total this page reaches that is `"exact"`, or that counts only what paging
   can reach: `null`.
7. Anything else, a lower bound on the matches this page reaches: `"unknown"`.

The hits counted are the ones the engine returned, before validation dropped
any, so a page the engine filled counts as full however many of its documents
the schema refused.

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
  // The page came back full and the count cannot say more.
}
```

`"unknown"` is not a failure and not a placeholder for zero. It is an engine
that counted enough to answer this page and not enough to commit to the next
one, and by rule 1 it only ever follows a full page. The alternatives are
worse: claiming a next page that does not exist ends the list on a request that
returns nothing and looks like a bug, and claiming there is none silently
truncates results.

[TanStack Query](tanstack-query.md) makes one documented choice about
`"unknown"` for infinite queries, and states what it costs.

## Page size has a ceiling, and the adapter checks it

An engine that cannot return a page as large as the one asked for refuses the
search before it sends anything:

```ts
await products.search("boots").page({ size: 500 }).execute();
// ScoutError { code: "unsupported-feature" }:
// Typesense returns at most 250 hits a page.
```

Each adapter knows its own engine's limit, so the refusal names it. The check
catches a page size the engine would reject; it says nothing about a page size
the engine will accept and then take a long time over. [Adapters](adapters.md)
lists the limits.

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
const getLabel = (total: SearchTotal) => {
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
differs whenever an engine limits pagination depth. A retrievable total that a
page reaches ends the list, because nothing past it can be fetched. An engine
that counts every match but pages no further than a window keeps
`scope: "matches"` and tells the core where the window ends, so the total stays
honest and the list still stops there.

Each adapter maps the engine's own report onto these. Typesense reports
`found`, which is `"exact"` unless `search_cutoff` says the engine stopped
early, and then `"estimated"`. [Adapters](adapters.md) has the mapping for the
others. Nothing in Scout computes a total from the hits it received, and
nothing computes a page count from a total.

## Why `took` is separate

```ts
result.took; // { milliseconds: 7, source: "provider" }
```

`source: "provider"` is the engine's own processing time, such as Typesense's
`search_time_ms`. `source: "scout"` is the time the core measured around the
call, on a monotonic clock, for an engine that reports no timing of its own.
The two numbers mean different things: one excludes the network and one
includes it, so the field says which one you have rather than blending them.
