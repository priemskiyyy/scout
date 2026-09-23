import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type React from "react";
import { useEffect, useMemo, useReducer, useState } from "react";

import { DialectsPanel } from "src/components/Engines/DialectsPanel";
import { EnginesPanel } from "src/components/Engines/EnginesPanel";
import { Footer } from "src/components/Footer/Footer";
import { Header } from "src/components/Header/Header";
import { Hero } from "src/components/Hero/Hero";
import { CachePanel } from "src/components/Identity/CachePanel";
import { IdentityPanel } from "src/components/Identity/IdentityPanel";
import { ErrorLegend } from "src/components/Lab/ErrorLegend";
import { LabPanel } from "src/components/Lab/LabPanel";
import { NetworkPanel } from "src/components/Lab/NetworkPanel";
import { NumbersPanel } from "src/components/Numbers/NumbersPanel";
import { LatestSearchPanel } from "src/components/Search/LatestSearchPanel";
import { Section } from "src/components/Section/Section";
import { StoreApp } from "src/components/Store/StoreApp";
import { TimelinePanel } from "src/components/Timeline/TimelinePanel";
import { useDebouncedValue } from "src/hooks/useDebouncedValue";
import { useQueryCacheEntries } from "src/hooks/useQueryCacheEntries";
import { createOutpostRuntime } from "examples/shared/outpost/runtime/createOutpostRuntime";
import {
  initialStoreState,
  storeReducer,
} from "examples/shared/outpost/state/storeReducer";
import type { Outpost } from "examples/shared/outpost/types/Outpost";
import type { OutpostRuntime } from "examples/shared/outpost/types/OutpostRuntime";
import type { ValidationMode } from "examples/shared/outpost/types/ValidationMode";
import { buildStoreSearch } from "examples/shared/outpost/utils/buildStoreSearch";
import { createStopSwitch } from "examples/shared/outpost/utils/createStopSwitch";
import { createStoreQueryOptions } from "examples/shared/outpost/utils/createStoreQueryOptions";
import { getLatestPage } from "examples/shared/outpost/utils/getLatestPage";
import { getSearchStatus } from "examples/shared/outpost/utils/getSearchStatus";

type ApplicationProps = { outpost: Outpost; runtime: OutpostRuntime };

export const Application: React.FunctionComponent<ApplicationProps> = ({
  outpost,
  runtime: initialRuntime,
}) => {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(storeReducer, initialStoreState);
  const [runtime, setRuntime] = useState(initialRuntime);
  const [disposed, setDisposed] = useState(false);
  const [stopSwitch] = useState(createStopSwitch);
  const query = useDebouncedValue(state.query, 250);
  const cached = useQueryCacheEntries().length;

  // The search is built from what the controls say once typing settles.
  const searched = useMemo(() => ({ ...state, query }), [state, query]);

  const search = useMemo(
    () => buildStoreSearch(runtime.indexes[searched.engine], searched),
    [runtime, searched],
  );

  const options = useMemo(
    () => createStoreQueryOptions(search, stopSwitch.getSignal),
    [search, stopSwitch],
  );

  const results = useInfiniteQuery({
    ...options,
    placeholderData: keepPreviousData,
  });

  const status = getSearchStatus(results);

  // Your API changed how it answers, so what the page cached from it is stale.
  useEffect(
    () =>
      outpost.backend.state.subscribe(() => {
        queryClient.invalidateQueries().catch(() => {});
      }),
    [outpost, queryClient],
  );

  useEffect(() => {
    runtime.record({ kind: "engine-selected", engine: state.engine });
  }, [runtime, state.engine]);

  // No adapter sees a search Scout answers itself, so the page records it.
  useEffect(() => {
    if (status !== "answered-by-scout") {
      return;
    }

    runtime.record({
      kind: "answered-by-scout",
      engine: searched.engine,
      query: searched.query,
    });
  }, [runtime, status, searched, results.dataUpdatedAt]);

  // A disposed Scout cannot search again, so a restart replaces it.
  const replaceRuntime = (validate: ValidationMode) => {
    runtime.dispose();

    const next = createOutpostRuntime({ ...outpost, validate });

    next.record({ kind: "restarted", validate });
    queryClient.removeQueries();
    setDisposed(false);
    setRuntime(next);
  };

  // A search after disposal is refused, so the store searches again to show it.
  const handleDisposePress = () => {
    if (disposed) {
      replaceRuntime(runtime.validate);

      return;
    }

    runtime.dispose();
    setDisposed(true);
    queryClient.invalidateQueries().catch(() => {});
  };

  return (
    <>
      <Header status={status} />
      <main className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-8 sm:px-6">
        <Hero />
        <Section
          id="store"
          hint="Search for tent, keep what is in stock, then sort by price. The code beside the store is the search it ran, and the total says how sure the engine was."
        >
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <StoreApp
              state={state}
              query={results}
              status={status}
              cached={cached}
              dispatch={dispatch}
              onStopPress={stopSwitch.stop}
              onSkipInvalidPress={() => replaceRuntime("skip")}
              onRestartPress={() => replaceRuntime(runtime.validate)}
            />
            <div className="min-w-0 xl:sticky xl:top-24">
              <LatestSearchPanel
                state={searched}
                query={results}
                queryKey={options.queryKey}
                status={status}
              />
            </div>
          </div>
        </Section>
        <Section
          id="engines"
          hint="Switch the store to MiniSearch with facet counts on: it refuses them rather than invent numbers. Then translate a negated group and see which dialect cannot write it."
        >
          <EnginesPanel
            runtime={runtime}
            state={searched}
            storeQuery={results}
            onEngineSelect={(engine) =>
              dispatch({ type: "ENGINE_SELECTED", engine })
            }
          />
          <DialectsPanel state={searched} />
        </Section>
        <Section
          id="numbers"
          hint="Make your API count roughly: the store says About, and the next page turns unknown. Then cap it at 10 and page on: the pages below the cap are promised, the ones past it are not."
        >
          <NumbersPanel
            backend={outpost.backend}
            engine={state.engine}
            latest={getLatestPage(results)}
            onUseApiPress={() =>
              dispatch({ type: "ENGINE_SELECTED", engine: "api" })
            }
          />
        </Section>
        <Section
          id="lab"
          hint="Slow your API to 1.5 s, type a new search and press Stop: Scout settles it at once, and the network shows your API stopped too. Switch on Ignore aborts and try again."
        >
          <div className="grid gap-3 xl:grid-cols-2">
            <LabPanel
              backend={outpost.backend}
              validate={runtime.validate}
              disposed={disposed}
              emptySet={state.emptySet}
              onValidateSelect={replaceRuntime}
              onEmptySetToggle={() => dispatch({ type: "EMPTY_SET_TOGGLED" })}
              onDisposePress={handleDisposePress}
            />
            <NetworkPanel backend={outpost.backend} />
          </div>
          <ErrorLegend error={results.error} />
        </Section>
        <Section
          id="identity"
          hint="Search for tent, then winter, then tent again: the second tent answers from the cache at once, because its key is the same."
        >
          <IdentityPanel runtime={runtime} />
          <CachePanel />
        </Section>
        <Section
          id="timeline"
          hint="Dispose Scout in the lab, then search: the store says why it cannot, and restarting it shows up here."
        >
          <TimelinePanel timeline={runtime.timeline} />
        </Section>
      </main>
      <Footer />
    </>
  );
};
