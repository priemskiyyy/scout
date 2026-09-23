import type React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { COLORS } from "src/utils/constants/colors";

type ChipProps = {
  label: string;
  count?: string | null;
  selected: boolean;
  onPress: () => void;
};

/** A filter or a preset: pressed shows it applies. */
export const Chip: React.FunctionComponent<ChipProps> = ({
  label,
  count = null,
  selected,
  onPress,
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected }}
    onPress={onPress}
    style={[styles.chip, selected && styles.selected]}
  >
    <Text style={[styles.label, selected && styles.selectedLabel]}>
      {label}
    </Text>
    {count === null ? null : <Text style={styles.count}>{count}</Text>}
  </Pressable>
);

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  selected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },
  label: { fontSize: 13, color: COLORS.body },
  selectedLabel: { fontWeight: "600", color: COLORS.accentText },
  count: { fontFamily: "Menlo", fontSize: 11, color: COLORS.muted },
});
