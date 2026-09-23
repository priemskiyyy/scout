---
description: "Outpost, an outdoor store searched through Scout: one index declaration on four engines in the page, six more translated, honest totals, a lab that breaks the engine, query identity and a timeline in React, and the store in Vue, Solid, Svelte and Expo."
---

<script setup>
import { withBase } from "vitepress";
</script>

# Example application

Outpost is a small outdoor store searched through Scout. One index declaration runs on four engines inside the page: your API through `@priemskiyyy/scout-http`, and Orama, MiniSearch and Fuse.js running in the browser. Six more adapters, Typesense, Algolia, Meilisearch, Elasticsearch, OpenSearch and MongoDB Search, are handed the same search over clients that record what they were given. Nothing leaves your browser, and no engine account is needed.

<img :src="withBase('/images/screenshots/outpost.png')" alt="Outpost searching for tent on your API: seven exact results with the word tent marked in each, filters with their counts, and the latest search beside them as the TypeScript that built it, its total, its next page and its timing" />

## Run it

There is no hosted demo. From the repository root:

```sh
pnpm install
pnpm build
pnpm --filter example-react dev
```

The example uses the built packages, so build them first.

## The tour

The page walks through six sections, each with a "Try this" hint:

1. **Search the store.** Every control builds one typed search, and **Latest search** beside the store shows the TypeScript that built it, call for call, with what came back: the total and how sure the engine was, the next page, who measured the time, and the query key. Highlights arrive as [parts](highlights.md) and are drawn as marks, never as markup. **Stop** aborts the search in flight.
2. **One declaration, ten engines.** The store's search runs on every engine in the page. Orama refuses highlights and MiniSearch and Fuse.js refuse facets, each saying why, because an engine that cannot do part of a search [refuses it](adapters.md) rather than answer a narrower one. **Six more dialects** shows what each remote adapter's client was handed, or the refusal it never reached.
3. **Numbers you can trust.** Make your API count roughly or only up to 10, count facets over a sample, or page through only the first 12 matches, and watch the store say "About" or "At least", show a dash for a facet value it did not count, and turn the [next page](pagination.md) unknown exactly when the count cannot say.
4. **Break the engine.** Slow your API down, take it offline, fail one request, refuse highlights, corrupt a document, plant one built to break out of the page, stop passing the signal on, ask for an empty set or dispose Scout. Each failure reaches the store with its [code](troubleshooting.md), and the network panel shows every request your API received.
5. **Same search, same key.** Searches written differently share one [key](internals/query-identity.md) when they mean the same thing. TanStack Query's cache lists every search under its key, and going back to one answers at once.
6. **Watch it happen.** Every adapter is wrapped with a spread that reports when a search reaches it and how it ends.

## What it configures

`examples/shared/outpost/utils/createProductIndex.ts` holds the one [index declaration](indexes.md), over a Zod schema, and `runtime/createOutpostRuntime.ts` binds it to the four engines. Your API is `backend/createCatalogueBackend.ts`, and the HTTP adapter reaches it through a `request` function, the same one a real application would give it over its own client. To search a real engine, replace one adapter: nothing in the store changes. The [example's README](https://github.com/priemskiyyy/scout/tree/main/examples/react#readme) maps each part of the page to its source.

## Vue, Solid, Svelte and Expo

The same store runs on every framework TanStack Query supports, over the same shared domain and Scout's framework-free `queryOptions` and `infiniteQueryOptions`:

```sh
pnpm --filter example-vue dev
pnpm --filter example-solid dev
pnpm --filter example-svelte dev
pnpm --filter example-expo dev
```

Each has the store and its latest search, with `@tanstack/vue-query`, `@tanstack/solid-query`, `@tanstack/svelte-query` or `@tanstack/react-query` in React Native. The React example is the full tour.
