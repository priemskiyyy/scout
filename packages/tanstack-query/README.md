# @priemskiyyy/scout-tanstack-query

TanStack Query options built from a Scout search. `queryOptions` and
`infiniteQueryOptions` return plain objects, so they go straight into
`useQuery`, `useInfiniteQuery`, `prefetchQuery`, `ensureQueryData` or
`queryClient.query`, and you can spread your own options over them. No hook is
wrapped or re-exported here, so your version of TanStack Query stays yours.

```sh
pnpm add @priemskiyyy/scout@next @priemskiyyy/scout-tanstack-query@next @tanstack/react-query
```

## One page

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

The query key is `search.key()`, the canonical identity of that search, so two
searches that mean the same thing share a cache entry and two that differ in
anything that changes results do not. The `signal` TanStack supplies is passed
into `search.execute({ signal })`, so an unmounted component or a superseded
keystroke settles the query at once, and an adapter whose SDK can cancel a
request cancels it.

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

// One flat list of hits, safe to key on `hit.id`.
const hits = useMemo(() => flattenHits(query.data), [query.data]);

const handleEndReached = () => {
  if (query.hasNextPage) {
    query.fetchNextPage();
  }
};
```

The page number is the page parameter, so it cannot also be part of the cache
key. The key is built from the search at page one with an `"infinite"` segment
after the namespace, which keeps one entry for the whole list, keeps it separate
from a normal query over the same search, and leaves every Scout query reachable
by the same namespace prefix when you invalidate.

`flattenHits` returns one de-duplicated array of hits, keyed on `hit.id`, with
the first occurrence of each hit keeping its place. This matters because every
Scout adapter paginates by page number: a document indexed while someone is
reading page one shifts everything along, and page two hands back the tail of
page one. Without de-duplication a virtualised list renders the same key twice.
The pages themselves are never touched, because they belong to the query cache.

## When the engine will not say whether there is a next page

`page.next` is a page number, `null`, or `"unknown"`. Scout preserves that
uncertainty instead of guessing, so this package makes the choice and states it:

- a number is believed and used;
- `null` ends the list;
- `"unknown"` advances to `page.current + 1`.

The core says `"unknown"` only for a page the engine filled, and a short page is
always `null`, so a full page is the one sign there may be more. If the real
last page happens to be exactly full, this costs one request that returns
nothing and then ends the list. That is the price of never silently truncating
results.

## Defaults stay yours

Nothing here sets `staleTime`, `gcTime`, `retry` or a refetch policy. Caching,
staleness and retries are TanStack Query's job and its defaults are your
application's to choose. The one worth choosing deliberately is `staleTime`: it
is `0` by default, which refetches far more than a search index usually needs,
so set it to something above zero. The value is still yours.
