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
  enabled: text.length > 0,
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

The `signal` TanStack supplies is passed into `execute`, which is what makes an
unmounted component or a superseded keystroke cancel the request rather than
only drop its answer. On an adapter with `cancellation: "logical"`, Algolia,
Orama and MiniSearch, it stops Scout waiting and the engine still finishes the
work.

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

| `page.next` | What the infinite query does                                          |
| ----------- | --------------------------------------------------------------------- |
| a number    | believed and used                                                     |
| `null`      | the list ends                                                         |
| `"unknown"` | advance to `page.current + 1` only while the last page came back full |

"Full" means `hits.length === page.size`. A page that came back short cannot be
followed by another one, so stopping there is safe. Invalid documents skipped
by validation still count toward a full provider page. A page that came back full
might still be the last page, in which case this costs exactly one request that
returns nothing and then ends the list.

That wasted request is the price of never silently truncating results. Treating
`"unknown"` as "no more pages" would drop real results on an engine that simply
declined to count; treating it as "always another page" would end every list on
an empty request instead of some of them.

Which engines produce `"unknown"` is in [pagination](pagination.md). Orama and
MiniSearch never do.

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

Retries are worth a thought too. A `ScoutError` with code
`"unsupported-feature"` or `"configuration"` will never succeed on a retry,
because it was refused before anything was sent:

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

What that means in practice is that a refusal Scout makes before dispatch, such
as a facet on MiniSearch or a page size above the adapter's limit, arrives in
`query.error` exactly like a provider failure does, and
[troubleshooting](troubleshooting.md) says which is which.

## One cache per security context

A `QueryClient` is shared by everything that uses it, and the query key contains
no credential by design. Separate per user or per tenant results with a separate
`QueryClient` rather than a key suffix, and dispose the `Scout` when the context
changes. See [security](security.md).
