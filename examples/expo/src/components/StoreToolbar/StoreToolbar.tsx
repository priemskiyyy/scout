import type React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ACCURACY_LABELS } from "examples/shared/outpost/constants/labels";
import {
  PROFILE_OPTIONS,
  SORT_OPTIONS,
} from "examples/shared/outpost/constants/store";
import { formatTotal } from "examples/shared/outpost/formatting/formatTotal";
import type { ProfileName } from "examples/shared/outpost/types/ProfileName";
import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
import type { SortName } from "examples/shared/outpost/types/SortName";
import type { StoreResult } from "examples/shared/outpost/types/StoreResult";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { ACCURACY_TONES } from "examples/shared/ui/constants/tones";
import { Badge } from "src/components/Badge/Badge";
import { Chip } from "src/components/Chip/Chip";
import { SegmentedControl } from "src/components/SegmentedControl/SegmentedControl";
import { COLORS } from "src/utils/constants/colors";

type StoreToolbarProps = {
  state: StoreState;
  status: SearchStatus;
  latest: StoreResult | null;
  onProfileSelect: (profile: ProfileName) => void;
  onSortSelect: (sort: SortName) => void;
  onFacetsToggle: () => void;
  onHighlightsToggle: () => void;
};

type TotalProps = { latest: StoreResult | null; status: SearchStatus };

// A search that failed has no total, and its problem is shown below.
const Total: React.FunctionComponent<TotalProps> = ({ latest, status }) => {
  if (status === "searching" && latest === null) {
    return <Text style={styles.total}>Searching…</Text>;
  }

  if (latest === null) {
    return null;
  }

  return (
    <View style={styles.totalRow}>
      <Text style={styles.total}>{formatTotal(latest.total)}</Text>
      <Badge
        tone={ACCURACY_TONES[latest.total.accuracy]}
        label={ACCURACY_LABELS[latest.total.accuracy]}
      />
    </View>
  );
};

export const StoreToolbar: React.FunctionComponent<StoreToolbarProps> = ({
  state,
  status,
  latest,
  onProfileSelect,
  onSortSelect,
  onFacetsToggle,
  onHighlightsToggle,
}) => (
  <View style={styles.toolbar}>
    <View accessibilityLiveRegion="polite">
      <Total latest={latest} status={status} />
    </View>
    <SegmentedControl
      label="Search in"
      options={PROFILE_OPTIONS}
      value={state.profile}
      onSelect={onProfileSelect}
    />
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel="Sort"
      contentContainerStyle={styles.row}
    >
      {SORT_OPTIONS.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          selected={option.value === state.sort}
          onPress={() => onSortSelect(option.value)}
        />
      ))}
    </ScrollView>
    <View style={styles.row}>
      <Chip
        label="Facet counts"
        selected={state.facets}
        onPress={onFacetsToggle}
      />
      <Chip
        label="Highlights"
        selected={state.highlights}
        onPress={onHighlightsToggle}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  toolbar: { gap: 10 },
  totalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  total: { fontSize: 18, fontWeight: "600", color: COLORS.text },
  row: { flexDirection: "row", gap: 6 },
});
