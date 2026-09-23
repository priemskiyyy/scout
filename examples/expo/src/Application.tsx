import { flattenHits } from "@priemskiyyy/scout-tanstack-query";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type React from "react";
import { useEffect, useMemo, useReducer, useState } from "react";
import { FlatList, StyleSheet } from "react-native";

import { ENGINE_GUIDES } from "examples/shared/outpost/constants/engines";
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
import { ResultRow } from "src/components/ResultRow/ResultRow";
import { StoreControls } from "src/components/StoreControls/StoreControls";
import { StoreFooter } from "src/components/StoreFooter/StoreFooter";
import { StoreOutcome } from "src/components/StoreOutcome/StoreOutcome";
import { useDebouncedValue } from "src/hooks/useDebouncedValue";
import type { StoreQuery } from "src/types/StoreQuery";
import { COLORS } from "src/utils/constants/colors";

type ApplicationProps = { outpost: Outpost; runtime: OutpostRuntime };

// A failed search shows its problem, not the rows of the one before it.
const getRows = (query: StoreQuery) => {
  if (query.error !== null) {
    return [];
  }

  return flattenHits(query.data);
};

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
  const latest = getLatestPage(results);
  const rows = getRows(results);
  const engineName = ENGINE_GUIDES[state.engine].name;

  // Your API changed how it answers, so what the app cached from it is stale.
  useEffect(
    () =>
      outpost.backend.state.subscribe(() => {
        queryClient.invalidateQueries().catch(() => {});
      }),
    [outpost, queryClient],
  );

  // A disposed Scout cannot search again, so a restart replaces it.
  const replaceRuntime = (validate: ValidationMode) => {
    runtime.dispose();

    const next = createOutpostRuntime({ ...outpost, validate });

    queryClient.removeQueries();
    setDisposed(false);
    setRuntime(next);
  };

  // A search after disposal is refused, so the store searches again to show it.
  const handleDisposeToggle = () => {
    if (disposed) {
      replaceRuntime(runtime.validate);

      return;
    }

    runtime.dispose();
    setDisposed(true);
    queryClient.invalidateQueries().catch(() => {});
  };

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      data={rows}
      keyExtractor={(hit) => hit.id}
      renderItem={({ item }) => (
        <ResultRow hit={item} dimmed={results.isPlaceholderData} />
      )}
      ListHeaderComponent={
        <StoreControls
          state={state}
          status={status}
          latest={latest}
          searching={results.isFetching}
          dispatch={dispatch}
          onStopPress={stopSwitch.stop}
        />
      }
      ListEmptyComponent={
        <StoreOutcome
          status={status}
          query={results}
          state={state}
          engineName={engineName}
          onFacetsToggle={() => dispatch({ type: "FACETS_TOGGLED" })}
          onHighlightsToggle={() => dispatch({ type: "HIGHLIGHTS_TOGGLED" })}
          onEmptySetToggle={() => dispatch({ type: "EMPTY_SET_TOGGLED" })}
          onClearPress={() => dispatch({ type: "FILTERS_CLEARED" })}
          onSkipInvalidPress={() => replaceRuntime("skip")}
          onRestartPress={() => replaceRuntime(runtime.validate)}
        />
      }
      ListFooterComponent={
        <StoreFooter
          state={state}
          searched={searched}
          query={results}
          status={status}
          latest={latest}
          shown={rows.length}
          backend={outpost.backend}
          disposed={disposed}
          onDisposeToggle={handleDisposeToggle}
          onEmptySetToggle={() => dispatch({ type: "EMPTY_SET_TOGGLED" })}
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { gap: 10, padding: 16, paddingTop: 64, paddingBottom: 40 },
});
