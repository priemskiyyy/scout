import type React from "react";
import { ScrollView, StyleSheet } from "react-native";

import { SEARCH_PRESETS } from "examples/shared/outpost/constants/store";
import { Chip } from "src/components/Chip/Chip";

type SearchPresetsProps = {
  query: string;
  onSelect: (query: string) => void;
};

export const SearchPresets: React.FunctionComponent<SearchPresetsProps> = ({
  query,
  onSelect,
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    accessibilityLabel="Try a search"
    contentContainerStyle={styles.row}
  >
    {SEARCH_PRESETS.map((preset) => (
      <Chip
        key={preset.label}
        label={preset.label}
        selected={preset.query === query}
        onPress={() => onSelect(preset.query)}
      />
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  row: { gap: 6 },
});
