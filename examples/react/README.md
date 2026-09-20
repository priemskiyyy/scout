# Scout search playground

An interactive catalogue running on real Orama, MiniSearch and Fuse.js engines.
It needs no server, account or credentials.

```sh
pnpm install
pnpm build
pnpm --filter example-react dev
```

Open the URL printed by Vite. The example uses the workspace packages' built
exports, so rebuild after changing library source.

- Switch engines while keeping the same search and selected filters.
- Try the search presets or enter a typo and compare matching behavior.
- Filter by brand, category, price and availability; remove individual chips or
  reset all filters. Orama supplies facet counts. The other engines use the same
  catalogue choices without fabricated counts.
- Load the next page. TanStack Query owns caching and page storage.
- Open **Inspect query** to copy the current portable search.
- Click a result to inspect its validated document and native engine payload.

The layout adapts to narrow screens, where **Filters** opens the filter panel.
All controls support the keyboard; the document dialog closes with Escape.

`src/search.ts` is the provider boundary. Components consume the same
`ProductShape` regardless of engine. The fixed corpus revision is appropriate
for this static demo; an application that changes the corpus must update it.
