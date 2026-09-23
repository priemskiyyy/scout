# Outpost on Solid

Outpost's store from the [React example](../react), rebuilt with Solid and
`@tanstack/solid-query`. The same typed search runs on the same four engines
inside the page, your API, Orama, MiniSearch and Fuse.js, so a refusal, a
stopped search or an honest total reads exactly as it does in React. Nothing
leaves your browser.

```sh
pnpm install
pnpm build
pnpm --filter example-solid dev
```

The packages are linked from the workspace, so build them first.

## How it uses Scout

`main.tsx` starts Outpost once, outside Solid, with `startOutpost` from
`examples/shared`, and gives TanStack Query the shared `QUERY_DEFAULTS`: a
refusal is final, and an engine that failed gets one retry. `Application.tsx`
keeps the store's controls in a signal run through the shared `storeReducer`,
builds the search with `buildStoreSearch`, and hands
`createStoreQueryOptions(search, stopSwitch.getSignal)` to `useInfiniteQuery`
as an accessor, with `placeholderData: keepPreviousData`:

- the query key is the search's canonical identity, so switching back to an
  earlier search answers from the cache at once
- the signal TanStack Query supplies reaches `execute`, and so does the Stop
  button's, so a stopped search settles as `aborted`
- `flattenHits` from `@priemskiyyy/scout-tanstack-query` turns the pages into
  one list for Load more
- a refused search keeps its `unsupported-feature` code, and the store offers to
  search again without the facet counts or highlights the engine cannot do

The catalogue, the index declaration, your API, the engines, the wording and
the Tailwind recipes come from `examples/shared`, so the components here are
the only Solid-specific part. `src/primitives` holds the two small primitives
Solid needs: a debounced accessor for the query, and an accessor over an
external store for the cache's size. The React example is the full tour: the
dialects, the numbers, the lab, query identity and the timeline.

## Tests

`pnpm vitest run --project example-solid` starts Outpost the way the page does,
with a fresh runtime per test, and drives it through its controls: tent on your
API answers seven exact results, and MiniSearch refuses facet counts and then
highlights until the store searches without them. Run
`pnpm --filter example-solid lint:typescript` to typecheck it.
