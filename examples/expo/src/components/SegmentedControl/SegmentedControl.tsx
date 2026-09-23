import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Option } from "examples/shared/outpost/types/Option";
import { COLORS } from "src/utils/constants/colors";

type SegmentedControlProps<T extends string | number> = {
  label: string;
  options: Option<T>[];
  value: T;
  onSelect: (value: T) => void;
};

export const SegmentedControl = <T extends string | number>({
  label,
  options,
  value,
  onSelect,
}: SegmentedControlProps<T>) => (
  <View role="group" accessibilityLabel={label} style={styles.control}>
    {options.map((option) => {
      const selected = option.value === value;

      return (
        <Pressable
          key={option.value}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          onPress={() => onSelect(option.value)}
          style={[styles.option, selected && styles.selected]}
        >
          <Text
            numberOfLines={1}
            style={[styles.label, selected && styles.selectedLabel]}
          >
            {option.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  control: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 999,
    backgroundColor: COLORS.border,
  },
  option: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 2,
    paddingVertical: 8,
    borderRadius: 999,
  },
  selected: { backgroundColor: COLORS.surface },
  label: { fontSize: 12, fontWeight: "500", color: COLORS.muted },
  selectedLabel: { color: COLORS.text },
});
