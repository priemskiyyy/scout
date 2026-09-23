import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { Button } from "src/components/Button/Button";
import { EmptyState } from "src/components/EmptyState/EmptyState";
import { StoreProblem } from "src/components/StoreProblem/StoreProblem";
import type { StoreQuery } from "src/types/StoreQuery";
import { COLORS } from "src/utils/constants/colors";

type StoreOutcomeProps = {
  status: SearchStatus;
  query: StoreQuery;
  state: StoreState;
  engineName: string;
  onFacetsToggle: () => void;
  onHighlightsToggle: () => void;
  onEmptySetToggle: () => void;
  onClearPress: () => void;
  onSkipInvalidPress: () => void;
  onRestartPress: () => void;
};

/** What the results list shows when it has no row to show. */
export const StoreOutcome: React.FunctionComponent<StoreOutcomeProps> = ({
  status,
  query,
  state,
  engineName,
  onFacetsToggle,
  onHighlightsToggle,
  onEmptySetToggle,
  onClearPress,
  onSkipInvalidPress,
  onRestartPress,
}) => {
  const handleRetryPress = () => {
    query.refetch().catch(() => {});
  };

  if (query.error !== null) {
    return (
      <StoreProblem
        error={query.error}
        engineName={engineName}
        state={state}
        onFacetsToggle={onFacetsToggle}
        onHighlightsToggle={onHighlightsToggle}
        onRetryPress={handleRetryPress}
        onSkipInvalidPress={onSkipInvalidPress}
        onRestartPress={onRestartPress}
      />
    );
  }

  if (query.data === undefined) {
    return (
      <View style={styles.searching}>
        <Text style={styles.searchingText}>Searching {engineName}…</Text>
      </View>
    );
  }

  // The engine never saw this search: the filter said it matches nothing.
  if (status === "answered-by-scout") {
    return (
      <EmptyState
        title="Nothing can match"
        description="A set with nothing in it matches nothing, so Scout answered on its own, with an exact total of zero, and never asked the engine."
        action={
          <Button
            label="Remove the empty set"
            variant="secondary"
            onPress={onEmptySetToggle}
          />
        }
      />
    );
  }

  return (
    <EmptyState
      title="Nothing matches"
      description="No product matches this search and these filters. The total says how sure the engine is of that."
      action={
        <Button
          label="Clear filters"
          variant="secondary"
          onPress={onClearPress}
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  searching: {
    alignItems: "center",
    paddingVertical: 24,
    borderRadius: 12,
    backgroundColor: COLORS.sunken,
  },
  searchingText: { fontSize: 14, color: COLORS.muted },
});
