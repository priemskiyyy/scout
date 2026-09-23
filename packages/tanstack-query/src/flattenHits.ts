/**
 * Flattens cached pages into a new array, keeping the first occurrence of
 * each hit id. This avoids duplicates when documents shift between pages
 * while the underlying index changes.
 *
 * @example
 * ```ts
 * const query = useInfiniteQuery(infiniteQueryOptions(products.search(text)));
 * const hits = useMemo(() => flattenHits(query.data), [query.data]);
 * ```
 */
export const flattenHits = <TPage extends { hits: readonly { id: string }[] }>(
  data: { pages: readonly TPage[] } | undefined,
): readonly TPage["hits"][number][] => {
  if (data === undefined) {
    return [];
  }

  const seen = new Set<string>();
  const hits: TPage["hits"][number][] = [];

  for (const page of data.pages) {
    for (const hit of page.hits) {
      if (seen.has(hit.id)) {
        continue;
      }

      seen.add(hit.id);
      hits.push(hit);
    }
  }

  return hits;
};
