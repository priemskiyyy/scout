import type React from "react";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "src/utils/constants/colors";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export const EmptyState: React.FunctionComponent<EmptyStateProps> = ({
  title,
  description,
  action,
}) => (
  <View style={styles.empty}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
    {action}
  </View>
);

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.faint,
  },
  title: { fontSize: 15, fontWeight: "500", color: COLORS.text },
  description: { fontSize: 13, textAlign: "center", color: COLORS.muted },
});
