import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { CATEGORY_LABELS } from "examples/shared/outpost/constants/labels";
import { formatPrice } from "examples/shared/outpost/formatting/formatPrice";
import { formatRating } from "examples/shared/outpost/formatting/formatRating";
import type { StoreHit } from "examples/shared/outpost/types/StoreHit";
import { getRequestedHighlight } from "examples/shared/outpost/utils/getRequestedHighlight";
import { Badge } from "src/components/Badge/Badge";
import { HighlightedText } from "src/components/HighlightedText/HighlightedText";
import { COLORS } from "src/utils/constants/colors";

type ResultRowProps = { hit: StoreHit; dimmed: boolean };

export const ResultRow: React.FunctionComponent<ResultRowProps> = ({
  hit,
  dimmed,
}) => {
  const { document } = hit;
  const category = CATEGORY_LABELS[document.category];

  return (
    <View style={[styles.row, dimmed && styles.dimmed]}>
      <View style={styles.tile}>
        <Text style={styles.tileText}>{category.slice(0, 1)}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <HighlightedText
            fragments={getRequestedHighlight(hit, "name")}
            text={document.name}
            style={styles.name}
          />
          <Text style={styles.price}>{formatPrice(document.price)}</Text>
        </View>
        <HighlightedText
          fragments={getRequestedHighlight(hit, "description")}
          text={document.description}
          style={styles.description}
          numberOfLines={3}
        />
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {document.brand} · {category} · ★ {formatRating(document.rating)}
          </Text>
          {document.inStock ? (
            <Badge tone="positive" label="In stock" />
          ) : (
            <Badge tone="neutral" label="Sold out" />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  dimmed: { opacity: 0.6 },
  tile: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
  },
  tileText: { fontSize: 18, fontWeight: "700", color: COLORS.accent },
  body: { flex: 1, gap: 4 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  name: { flex: 1, fontSize: 15, fontWeight: "600", color: COLORS.text },
  price: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  description: { fontSize: 13, lineHeight: 19, color: COLORS.body },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  metaText: { fontSize: 12, color: COLORS.muted },
});
