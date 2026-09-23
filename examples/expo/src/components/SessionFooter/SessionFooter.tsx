import { useIsFetching } from "@tanstack/react-query";
import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { ENGINE_GUIDES } from "examples/shared/outpost/constants/engines";
import type { EngineId } from "examples/shared/outpost/types/EngineId";
import { COLORS } from "src/utils/constants/colors";

type SessionFooterProps = { engine: EngineId };

/** The store's session in one line: which engine answers and what is in flight. */
export const SessionFooter: React.FunctionComponent<SessionFooterProps> = ({
  engine,
}) => {
  const fetching = useIsFetching();

  return (
    <View role="contentinfo" accessibilityLabel="Session" style={styles.footer}>
      <Text style={[styles.text, styles.label]}>Outpost session</Text>
      <Text style={styles.text}>{ENGINE_GUIDES[engine].packageName}</Text>
      <Text style={styles.text}>fetching {fetching}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 4,
  },
  text: { fontFamily: "Menlo", fontSize: 12, color: COLORS.muted },
  label: { fontWeight: "600", color: COLORS.body },
});
