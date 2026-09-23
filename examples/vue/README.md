# Outpost on Vue

The outdoor store from the [React example](../react), rebuilt with Vue. It runs on the same Scout, the same four engines and the same shared search from `examples/shared`, so a search for `tent` on your API answers seven results with the matches highlighted, and MiniSearch refuses facet counts and highlights rather than invent them, exactly as in React. Nothing leaves your browser.

```sh
pnpm install
pnpm build
pnpm --filter example-vue dev
```

The packages are linked from the workspace, so build them first.

Scout needs no Vue binding. TanStack Query's own, `@tanstack/vue-query`, runs the store's search from `infiniteQueryOptions` in `@priemskiyyy/scout-tanstack-query`, and every Vue component reads the query through one unwrapped view:

```vue
<script setup lang="ts">
import { keepPreviousData, useInfiniteQuery } from "@tanstack/vue-query";

const results = useInfiniteQuery(() => ({
  ...createStoreQueryOptions(search.value, stopSwitch.getSignal),
  placeholderData: keepPreviousData,
}));
</script>
```

| File                                          | Role                                                                                            |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/main.ts`                                 | Starts Outpost once with the shared `startOutpost`, outside Vue, and installs TanStack Query.   |
| `src/Application.vue`                         | The store's state, the debounced query, the search, its infinite query and a Scout restart.     |
| `src/composables/useStoreState.ts`            | The store's controls as one state that only the shared reducer changes.                         |
| `src/components/Store/StoreApp.vue`           | The store: the engine, the search field, the filters with their honest counts, and the results. |
| `src/components/Search/LatestSearchPanel.vue` | The code that built the search, the total and how sure it is, the next page and the query key.  |

The React example is the full tour: the dialects, the lab, query identity and the timeline. `pnpm vitest run --project example-vue` drives the page through its buttons in jsdom.
