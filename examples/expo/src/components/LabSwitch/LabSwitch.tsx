import type React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { COLORS } from "src/utils/constants/colors";

type LabSwitchProps = {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
};

export const LabSwitch: React.FunctionComponent<LabSwitchProps> = ({
  label,
  description,
  value,
  onToggle,
}) => (
  <View style={styles.row}>
    <View style={styles.text}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
    <Switch
      accessibilityLabel={label}
      value={value}
      onValueChange={onToggle}
      trackColor={{ true: COLORS.accent, false: COLORS.border }}
      thumbColor={COLORS.surface}
    />
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.sunken,
  },
  text: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: "500", color: COLORS.text },
  description: { fontSize: 12, lineHeight: 17, color: COLORS.muted },
});
