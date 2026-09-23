import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/solid-query";
import { createMemo, createSignal, onCleanup } from "solid-js";
import type { Component } from "solid-js";

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
import { Footer } from "src/components/Footer/Footer";
import { Header } from "src/components/Header/Header";
import { Hero } from "src/components/Hero/Hero";
import { LatestSearchPanel } from "src/components/Search/LatestSearchPanel";
import { StoreApp } from "src/components/Store/StoreApp";
import { useDebouncedValue } from "src/primitives/useDebouncedValue";

type ApplicationProps = { outpost: Outpost; runtime: OutpostRuntime };

export const Application: Component<ApplicationProps> = (props) => {
  const queryClient = useQueryClient();
  const [state, setState] = createSignal(initialStoreState);
  const [runtime, setRuntime] = createSignal(props.runtime);
  const stopSwitch = createStopSwitch();
  const query = useDebouncedValue(() => state().query, 250);

  const dispatch = (action: StoreAction) => {
    setState((current) => storeReducer(current, action));
  };

  // The search is built from what the controls say once typing settles.
  const searched = createMemo(() => ({ ...state(), query: query() }));

  const options = createMemo(() =>
    createStoreQueryOptions(
      buildStoreSearch(runtime().indexes[searched().engine], searched()),
      stopSwitch.getSignal,
    ),
  );

  const results = useInfiniteQuery(() => ({
    ...options(),
    placeholderData: keepPreviousData,
  }));

  const status = () => getSearchStatus(results);

  // Your API changed how it answers, so what the page cached from it is stale.
  onCleanup(
    props.outpost.backend.state.subscribe(() => {
      queryClient.invalidateQueries().catch(() => {});
    }),
  );

  // A disposed Scout cannot search again, so a restart replaces it.
  const replaceRuntime = (validate: ValidationMode) => {
    runtime().dispose();
    queryClient.removeQueries();
    setRuntime(createOutpostRuntime({ ...props.outpost, validate }));
  };

  return (
    <>
      <Header status={status()} />
      <main class="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
        <Hero />
        <div class="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <StoreApp
            state={state()}
            query={results}
            status={status()}
            dispatch={dispatch}
            onStopPress={stopSwitch.stop}
            onSkipInvalidPress={() => replaceRuntime("skip")}
            onRestartPress={() => replaceRuntime(runtime().validate)}
          />
          <div class="min-w-0 xl:sticky xl:top-24">
            <LatestSearchPanel
              state={searched()}
              query={results}
              queryKey={options().queryKey}
              status={status()}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};
