import type React from "react";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { Tone } from "examples/shared/ui/types/Tone";
import { Badge } from "src/components/Badge/Badge";
import { COLORS } from "src/utils/constants/colors";

type SearchProblemProps = {
  tone: Tone;
  code: string;
  title: string;
  message: string;
  explanation: string;
  actions: ReactNode;
};

/** A search that did not answer, with its code, its reason and a way on. */
export const SearchProblem: React.FunctionComponent<SearchProblemProps> = ({
  tone,
  code,
  title,
  message,
  explanation,
  actions,
}) => (
  <View role="alert" style={styles.problem}>
    <View style={styles.titleRow}>
      <Text style={styles.title}>{title}</Text>
      <Badge tone={tone} label={code} />
    </View>
    <Text style={styles.message}>{message}</Text>
    <Text style={styles.explanation}>{explanation}</Text>
    <View style={styles.actions}>{actions}</View>
  </View>
);

const styles = StyleSheet.create({
  problem: {
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.faint,
    backgroundColor: COLORS.surface,
  },
  titleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  title: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  message: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: COLORS.sunken,
    fontFamily: "Menlo",
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.body,
  },
  explanation: { fontSize: 13, lineHeight: 19, color: COLORS.muted },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
