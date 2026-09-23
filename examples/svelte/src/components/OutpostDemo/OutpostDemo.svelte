<script lang="ts">
  import {
    createInfiniteQuery,
    keepPreviousData,
    useQueryClient,
  } from "@tanstack/svelte-query";
  import { createOutpostRuntime } from "examples/shared/outpost/runtime/createOutpostRuntime";
  import {
    initialStoreState,
    storeReducer,
  } from "examples/shared/outpost/state/storeReducer";
  import type { Outpost } from "examples/shared/outpost/types/Outpost";
  import type { OutpostRuntime } from "examples/shared/outpost/types/OutpostRuntime";
  import type { StoreAction } from "examples/shared/outpost/types/StoreAction";
  import type { ValidationMode } from "examples/shared/outpost/types/ValidationMode";
  import { buildStoreSearch } from "examples/shared/outpost/utils/buildStoreSearch";
  import { createStopSwitch } from "examples/shared/outpost/utils/createStopSwitch";
  import { createStoreQueryOptions } from "examples/shared/outpost/utils/createStoreQueryOptions";
  import { getSearchStatus } from "examples/shared/outpost/utils/getSearchStatus";
  import Footer from "src/components/Footer/Footer.svelte";
  import Header from "src/components/Header/Header.svelte";
  import Hero from "src/components/Hero/Hero.svelte";
  import LatestSearchPanel from "src/components/Search/LatestSearchPanel.svelte";
  import StoreApp from "src/components/Store/StoreApp.svelte";
  import { useDebounced } from "src/utilities/useDebounced.svelte";
  import { useExternalStore } from "src/utilities/useExternalStore";

  type Props = { outpost: Outpost; runtime: OutpostRuntime };

  let { outpost, runtime: initialRuntime }: Props = $props();

  const queryClient = useQueryClient();
  const cache = queryClient.getQueryCache();
  const stopSwitch = createStopSwitch();

  // Only the first Scout comes in as a prop; a restart replaces it here.
  // svelte-ignore state_referenced_locally
  let runtime = $state.raw(initialRuntime);
  let storeState = $state.raw(initialStoreState);

  const query = useDebounced(() => storeState.query, 250);

  // Only a search added or removed changes how many are cached.
  const cached = useExternalStore(
    (listener) =>
      cache.subscribe((event) => {
        if (event.type !== "added" && event.type !== "removed") {
          return;
        }

        listener();
      }),
    () => cache.getAll().length,
  );

  const dispatch = (action: StoreAction) => {
    storeState = storeReducer(storeState, action);
  };

  // The search is built from what the controls say once typing settles.
  const searched = $derived({ ...storeState, query: query.current });

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

  const status = $derived(getSearchStatus(results));

  // A disposed Scout cannot search again, so a restart replaces it.
  const replaceRuntime = (validate: ValidationMode) => {
    runtime.dispose();

    const next = createOutpostRuntime({ ...outpost, validate });

    next.record({ kind: "restarted", validate });
    queryClient.removeQueries();
    runtime = next;
  };
</script>

<Header {status} />
<main class="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
  <Hero />
  <div
    class="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
  >
    <StoreApp
      {storeState}
      query={results}
      {status}
      cached={cached.current}
      {dispatch}
      onStopPress={stopSwitch.stop}
      onSkipInvalidPress={() => replaceRuntime("skip")}
      onRestartPress={() => replaceRuntime(runtime.validate)}
    />
    <div class="min-w-0 xl:sticky xl:top-24">
      <LatestSearchPanel
        storeState={searched}
        query={results}
        queryKey={options.queryKey}
        {status}
      />
    </div>
  </div>
</main>
<Footer />
