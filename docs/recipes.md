---
description: "Search as you type with a debounced value, de-duplicating hits after flattening infinite pages, and keeping selection on hit ids rather than positions."
---

# Recipes

Three patterns that come up in every search screen. They are application code,
not Scout features, and that is deliberate: Scout builds and executes searches,
TanStack Query owns fetching and caching, and the timing belongs to you.

## Search as you type

Debouncing is not in the builder. What you need is three values, not one: what
the person typed, what has been searched for, and whether the results on screen
belong to the first of those.

```tsx
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryOptions } from "@priemskiyyy/scout-tanstack-query";

export const ProductSearch = () => {
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text), 200);
    return () => clearTimeout(timer);
  }, [text]);

  // Scout: building a search sends nothing, so rebuilding it is free.
  const search = useMemo(
    () => products.search(debounced).facets("brand").highlight("name"),
    [debounced],
  );

  // TanStack Query: fetching, caching and cancellation.
  const { data, isFetching } = useQuery({
    ...queryOptions(search),
    enabled: debounced.length > 0,
    staleTime: 30_000,
  });

  const stale = debounced !== text || isFetching;

  return (
    <div aria-busy={stale}>
      <input value={text} onChange={(event) => setText(event.target.value)} />
      <ul>
        {data?.hits.map((hit) => (
          <li key={hit.id}>{hit.document.name}</li>
        ))}
      </ul>
    </div>
  );
};
```

Three things are load bearing here.

`enabled: debounced.length > 0` is not politeness. An index rejects an empty
query with `SearchValidationError` unless it declares `emptyQuery: "allow"`,
because what an engine does with empty text differs and guessing a wildcard
would be a silent transformation. See [indexes](indexes.md).

`stale` is derived rather than observed. `isFetching` alone flickers, and it is
false during the debounce window, when the results on screen are already known
to be behind. Comparing `debounced` with `text` covers that window; using both
covers the request too.

Rebuilding the search on every render costs nothing. Every builder method
returns a new frozen description and allocates no request; only `execute()`
sends, and the TanStack integration is what calls it. The `useMemo` is there to
keep the query key stable between renders that did not change the text, not to
save allocation.

The one engine specific note: on an adapter with
`cancellation: "logical"`, which is Algolia, Orama and MiniSearch, aborting a
superseded keystroke stops Scout waiting but does not stop the engine. On
Algolia that query still runs and is still billed, so the debounce interval is a
cost decision, not only a latency one. Typesense and Meilisearch declare
`cancellation: "transport"` and really cancel the request. See
[adapters](adapters.md).

## De-duplicate after flattening

Every Scout adapter paginates by page number. If a document is added to or
removed from the index between two fetches, the window shifts, and page two
hands back part of page one. A list keyed on `hit.id` then renders the same key
twice, which React and every virtualiser treat as an application bug.

`flattenHits` is the answer, and it already does the de-duplication: first
occurrence wins, so a hit keeps the position the reader already saw it in.

```tsx
import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  flattenHits,
  infiniteQueryOptions,
} from "@priemskiyyy/scout-tanstack-query";

const query = useInfiniteQuery({
  ...infiniteQueryOptions(products.search(debounced).pageSize(20)),
  staleTime: 30_000,
});

const hits = useMemo(() => flattenHits(query.data), [query.data]);

const handleEndReached = () => {
  if (query.hasNextPage && !query.isFetchingNextPage) {
    query.fetchNextPage();
  }
};
```

`flattenHits` returns a new array and never touches the pages, because
`query.data.pages` is the query cache's own data and is shared by reference with
every other consumer of that cache entry. Mutating it there would corrupt the
cache for everyone.

The core does not de-duplicate, because it only ever sees one page and cannot
know what the previous one contained. See
[TanStack Query](tanstack-query.md) for how pages advance and
[pagination](pagination.md) for what `page.next` means.

## Select by id, never by position

`hit.id` is whatever the index's own `id()` function returned for the document.
It is stable across pages, across refetches and across a rebuilt corpus. A
position in the flattened array is not: a refetch that repopulates from page one,
an invalidation, or one newly indexed document moves every index after it. The
bug only appears past page one, which is why it survives review.

```tsx
const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

const handleToggle = (id: string) => {
  setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) {
      next.delete(id);
      return next;
    }
    next.add(id);
    return next;
  });
};

const focused = hits.find((hit) => hit.id === focusedId);
```

Store ids, look up by id, and pass ids to anything that outlives the list: a
detail route, a bulk action, a restored scroll position. If you need the
selection to survive a filter change, ids still work and positions never did.
