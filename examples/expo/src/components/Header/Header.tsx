import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { STATUS_LABELS } from "examples/shared/outpost/constants/labels";
import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
import { STATUS_TONES } from "examples/shared/ui/constants/tones";
import { Badge } from "src/components/Badge/Badge";
import { COLORS } from "src/utils/constants/colors";

type HeaderProps = { status: SearchStatus };

export const Header: React.FunctionComponent<HeaderProps> = ({ status }) => (
  <View style={styles.header}>
    <View style={styles.logo}>
      <Text style={styles.logoText}>O</Text>
    </View>
    <View style={styles.names}>
      <Text role="heading" style={styles.title}>
        Outpost
      </Text>
      <Text style={styles.subtitle}>Outdoor gear, searched through Scout</Text>
    </View>
    <View style={styles.status} accessibilityLiveRegion="polite">
      <Badge tone={STATUS_TONES[status]} label={STATUS_LABELS[status]} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: COLORS.accent,
  },
  logoText: { fontSize: 17, fontWeight: "700", color: COLORS.onAccent },
  names: { flexShrink: 1 },
  title: { fontSize: 24, fontWeight: "700", color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.muted },
  status: { marginLeft: "auto" },
});
