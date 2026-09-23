# Outpost on Svelte

Outpost's store from the [React example](../react), rebuilt with Svelte 5 runes and `@tanstack/svelte-query`. It runs on the same shared Outpost: the same index declaration, your API, Orama, MiniSearch and Fuse.js in the page, the same store reducer and the same search builder, so a search is built, refused, answered and counted exactly as it is in React.

```sh
pnpm build
pnpm --filter example-svelte dev
```

`main.ts` starts Outpost once, outside Svelte, with `startOutpost` from `examples/shared`, builds the `QueryClient` from the shared `QUERY_DEFAULTS`, and mounts the application. `Application.svelte` publishes the client with `QueryClientProvider`, and `OutpostDemo.svelte` below it owns the search. The store's state is the shared `storeReducer` over `$state.raw`, the query waits for typing to settle in `useDebounced`, and the search is a `$derived` value that `createInfiniteQuery` reads through its options accessor:

```svelte
<script lang="ts">
  const search = $derived(
    buildStoreSearch(runtime.indexes[searched.engine], searched),
  );

  const options = $derived(
    createStoreQueryOptions(search, stopSwitch.getSignal),
  );

  const results = createInfiniteQuery(() => ({
    ...options,
    placeholderData: keepPreviousData,
  }));
</script>
```

Scout's `infiniteQueryOptions` are plain TanStack Query options, so they go into Svelte's binding unchanged: the key is the search's canonical identity, and the signal TanStack Query hands the query function reaches `execute`, together with the Stop button's own. The formatting, the recipes, the icons and the theme all come from `examples/shared`, so the markup here is the only Svelte-specific part.

This port is the store and its latest search. The dialects, the lab, the numbers, the query identity and the timeline live in the React tour.

## Tests

`pnpm vitest run --project example-svelte` mounts the application the way the page does, with a fresh Outpost per test: tent on your API answers with its seven products and their highlights, and MiniSearch refuses facet counts and highlights until the store searches without them. `pnpm test:examples` drives the built page in Chromium at phone and desktop widths. Run `pnpm --filter example-svelte lint:typescript` to typecheck it.
