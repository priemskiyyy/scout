# Outpost, a Scout example

Outpost is a small outdoor store, built to show what [Scout](../../README.md) does with one typed search. The same index declaration runs on four engines inside the page, your API through `@priemskiyyy/scout-http`, Orama, MiniSearch and Fuse.js, and six more adapters are handed the same search over clients that record what they were given. Nothing leaves your browser, and no engine account is needed.

```sh
pnpm install
pnpm build
pnpm --filter example-react dev
```

The packages are linked from the workspace, so build them first.

## The tour

The page walks through six sections, each with a "Try this" hint:

1. **Search the store.** Every control builds one typed search: the query, the profile, the filters, the sort, facet counts and highlights, and a page of eight. **Latest search** beside the store shows the TypeScript that built it, call for call, and what came back: the total and how sure the engine was, the next page, the facets, who measured the time, and the query key. Highlights arrive as parts and are drawn as marks, never as markup. **Stop** aborts the search in flight.
2. **One declaration, ten engines.** The store's search runs on every engine in the page at once. Orama refuses highlights, MiniSearch and Fuse.js refuse facets, and each refusal says why. **Six more dialects** hands the same search to Typesense, Algolia, Meilisearch, Elasticsearch, OpenSearch and MongoDB Search, and shows exactly what each client was handed, or the refusal it never reached: a negated group Algolia cannot write, a page of 500 Typesense will not serve, a hostile value each one escapes its own way.
3. **Numbers you can trust.** Make your API count roughly, or only up to 10, count facets over a sample, or page through only the first 12 matches. The store says "About" or "At least", a facet value it did not reach shows as a dash rather than 0, and the next page turns unknown exactly when the count cannot say.
4. **Break the engine.** Slow your API down, take it offline, fail one request, refuse highlights, corrupt a document, plant one built to break out of the page, stop passing the signal on, ask for an empty set or dispose Scout. The network panel shows every request your API received, with its body, and the legend says what each failure code means.
5. **Same search, same key.** Two searches written differently share one key when they mean the same thing, and the same search on two engines does not. TanStack Query's cache lists every search under its key; go back to one and it answers at once.
6. **Watch it happen.** Every adapter is wrapped with a spread that reports when a search reaches it and how it ends: answered, refused, failed, aborted, or answered after its caller had gone.

**Reset demo** in the header starts over.

## How it fits together

The domain lives in [`examples/shared`](../README.md#shared-code), which the Vue, Solid, Svelte and Expo examples use too. This folder is the React page over it.

| File                                                                    | Role                                                                                                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/main.tsx`                                                          | Starts Outpost once, outside React, and hands it to the page with a QueryClient built from the shared defaults.                |
| `../shared/outpost/utils/createProductIndex.ts`                         | The one index declaration: the Zod schema, the searchable, filterable, facetable and highlightable fields, sorts and profiles. |
| `../shared/outpost/runtime/createOutpostRuntime.ts`                     | One Scout over four engines, each adapter wrapped by `traceAdapter` for the timeline. A restart is a new one.                  |
| `../shared/outpost/backend/createCatalogueBackend.ts`                   | Your API: its own search in `answerSearch.ts`, the lab's switches, and the network log.                                        |
| `../shared/outpost/dialects/translateSearch.ts`                         | The six more adapters over recording clients, and the portable request every adapter receives.                                 |
| `../shared/outpost/utils/buildStoreSearch.ts`                           | The store's controls as one builder chain; `formatting/formatSearchCode.ts` prints the same chain as code.                     |
| `../shared/outpost/utils/createStoreQueryOptions.ts`                    | Scout's `infiniteQueryOptions`, with the Stop button's signal beside TanStack Query's own.                                     |
| `src/components/Store/`                                                 | The store: filters with honest counts, results with highlight parts, and a problem state for every failure code.               |
| `src/components/Search/`                                                | The latest search: its code, what came back, and its key.                                                                      |
| `src/components/Engines/`, `Numbers/`, `Lab/`, `Identity/`, `Timeline/` | The other five sections.                                                                                                       |

## Tests

`pnpm vitest run --project example-react` drives the page through its buttons in jsdom, and `pnpm vitest run --project example-shared` tests the domain in Node. `pnpm test:examples` builds the example and drives it in Chromium at phone and desktop widths.
