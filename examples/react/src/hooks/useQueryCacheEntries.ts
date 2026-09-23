import type { Query, QueryCacheNotifyEvent } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

// A query's options are rebuilt on every render, which TanStack Query
// announces; only what changes the cache's contents is worth a render.
const CHANGES: readonly QueryCacheNotifyEvent["type"][] = [
  "added",
  "removed",
  "updated",
  "observerAdded",
  "observerRemoved",
];

/** Every query TanStack Query holds, refreshed when the cache changes. */
export const useQueryCacheEntries = () => {
  const cache = useQueryClient().getQueryCache();
  const [entries, setEntries] = useState<Query[]>(() => cache.getAll());

  useEffect(
    () =>
      cache.subscribe((event) => {
        if (!CHANGES.includes(event.type)) {
          return;
        }

        setEntries(cache.getAll());
      }),
    [cache],
  );

  return entries;
};
