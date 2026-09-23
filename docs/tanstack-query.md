---
description: "Turn a Scout search into TanStack Query options, page through results with an infinite query, flatten and de-duplicate hits, and understand the one heuristic the integration has to make."
---

# TanStack Query

`queryOptions` and `infiniteQueryOptions` turn one search into plain option
objects. Nothing is wrapped and no hook is re-exported, so your version of
TanStack Query stays yours.

```ts
import { useQuery } from "@tanstack/react-query";
import { queryOptions } from "@priemskiyyy/scout-tanstack-query";

const { data } = useQuery({
  ...queryOptions(products.search(text).facets("brand").highlight("name")),
  staleTime: 30_000,
});

const names = data?.hits.map((hit) => hit.document.name) ?? [];
const brands = data?.facets.brand.values ?? [];
```

The result keeps every type the index gave it: `hit.document` is your document,
`facets.brand` is there because the search asked for it, and
`hit.highlights.name` is there because the search asked for that.

## What `queryOptions` actually returns

Two fields, and nothing else:

```ts
{
  queryKey: search.key(),
  queryFn: ({ signal }) => search.execute({ signal }),
}
```

The key is the canonical identity of the search, so two searches that mean the
same thing share a cache entry and two that differ in anything that changes
results do not. [Query identity](internals/query-identity.md) lists what is in
it and what is deliberately not.

The `signal` TanStack supplies is passed into `execute`, so an unmounted
component or a superseded keystroke settles the query at once, and an adapter
whose SDK can cancel a request cancels it. One that cannot lets the engine
finish the work while Scout has already stopped waiting.

Because the object is plain, it goes anywhere options go:

```ts
await queryClient.prefetchQuery(queryOptions(search));
const result = await queryClient.ensureQueryData(queryOptions(search));
```

## Many pages

```ts
import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  flattenHits,
  infiniteQueryOptions,
} from "@priemskiyyy/scout-tanstack-query";

const query = useInfiniteQuery({
  ...infiniteQueryOptions(products.search(text)),
  staleTime: 30_000,
});

const hits = useMemo(() => flattenHits(query.data), [query.data]);

const handleEndReached = () => {
  if (query.hasNextPage) {
    query.fetchNextPage();
  }
};
```

The page number is the page parameter here, so it cannot also be part of the
cache key. The key is built from the search at page one with an `"infinite"`
segment inserted after the namespace:

```ts
["scout", "infinite", "products", "<canonical request>"];
```

That keeps one entry for the whole list, keeps it separate from a normal query
over the same search, which would otherwise be one page pretending to be all of
them, and leaves every Scout query reachable by the same `"scout"` prefix when
you invalidate.

`getPreviousPageParam` reads `page.previous`, which is a real page number or
`null`, so nothing is guessed in that direction.

## The one heuristic: when `next` is `"unknown"`

`page.next` is a page number, `null`, or `"unknown"`. The core preserves that
uncertainty rather than inventing a page count, and this package makes the
choice and states it:

| `page.next` | What the infinite query does  |
| ----------- | ----------------------------- |
| a number    | believed and used             |
| `null`      | the list ends                 |
| `"unknown"` | advance to `page.current + 1` |

The core says `"unknown"` only for a page the engine filled, counting documents
validation dropped, and a short page is always `null`. A full page is the one
sign there may be more, so the list asks. If the real last page happens to be
exactly full, this costs one request that returns nothing, and then the list
ends.

That wasted request is the price of never silently truncating results. Treating
`"unknown"` as "no more pages" would drop real results on an engine that simply
declined to count. [Pagination](pagination.md) has the rules behind `next`.

## `flattenHits`

```ts
const hits = flattenHits(query.data);
```

It returns one array of hits with no hit repeated, keyed on `hit.id`, with the
first occurrence keeping the position the user already saw it in. It returns a
new array and never touches the pages, because those are the query cache's own
data and are shared by reference with every other consumer.

De-duplication is not polish. Every Scout adapter paginates by page number, so a
document indexed or removed between two fetches shifts the window, and page two
hands back part of page one. A list keyed on `hit.id` then renders the same key
twice, which React and every virtualiser treat as a bug in your application.

Scout's core does not de-duplicate, because it only ever sees one page.

`flattenHits` takes an infinite query's data. Handing it a single page is a
compile error, and handing it `undefined`, which is what `query.data` is before
the first page answers, returns an empty array.

## Defaults stay yours

Nothing in this package sets `staleTime`, `gcTime`, `retry` or a refetch policy.
Caching, staleness and retries are TanStack Query's job and its defaults are
your application's to choose.

The one worth choosing deliberately is `staleTime`. It is `0` by default, which
means every remount and every window focus refetches, far more often than a
search index usually changes. Something above zero is almost always right for
search, and the value is still yours.

Retries are worth a thought too. Only a `ScoutError` with code `"provider"` is
worth retrying: a refusal or a rejected document gets the same answer every
time, and an aborted or disposed search was stopped on purpose.

```ts
import { ScoutError } from "@priemskiyyy/scout";

useQuery({
  ...queryOptions(search),
  retry: (failureCount, error) => {
    if (error instanceof ScoutError && error.code !== "provider") {
      return false;
    }

    return failureCount < 3;
  },
});
```

## Errors reach the query, not a return value

`execute()` rejects on failure, and nothing in Scout returns an error value.
That is deliberate: TanStack Query only enters its error state when the query
function rejects, so a returned error union would be cached as a successful
result and then rethrown anyway.

What that means in practice is that a refusal, such as a facet on an engine
that has none or a page size above the engine's limit, arrives in `query.error`
exactly like a provider failure does, and [troubleshooting](troubleshooting.md)
says which is which.

`queryOptions` calls `search.key()` as it builds the options, so a mistake only
the runtime can see, such as a sort name read from a URL, throws there rather
than in the query function.

## One cache per security context

A `QueryClient` is shared by everything that uses it, and the query key contains
no credential by design. Separate per user or per tenant results with a separate
`QueryClient` rather than a key suffix, and dispose the `Scout` when the context
changes. See [security](security.md).
