import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { formatShown } from "examples/shared/outpost/formatting/formatShown";
import type { StoreResult } from "examples/shared/outpost/types/StoreResult";
import { Button } from "src/components/Button/Button";
import { COLORS } from "src/utils/constants/colors";

type LoadMoreProps = {
  shown: number;
  latest: StoreResult;
  loading: boolean;
  onPress: () => void;
};

// What the core derived about the next page decides what the list says.
const getHint = (next: StoreResult["page"]["next"]) => {
  if (next === "unknown") {
    return "The count cannot say whether there is more, so the list asks for another page.";
  }

  if (next === null) {
    return "That is the last page the engine can serve.";
  }

  return null;
};

export const LoadMore: React.FunctionComponent<LoadMoreProps> = ({
  shown,
  latest,
  loading,
  onPress,
}) => {
  const hint = getHint(latest.page.next);

  return (
    <View style={styles.loadMore}>
      {latest.page.next === null ? null : (
        <Button
          label="Load more"
          variant="secondary"
          disabled={loading}
          onPress={onPress}
        />
      )}
      <Text style={styles.shown}>{formatShown(shown, latest.total)}</Text>
      {hint === null ? null : <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  loadMore: { alignItems: "flex-start", gap: 6 },
  shown: { fontSize: 13, color: COLORS.body },
  hint: { fontSize: 12, color: COLORS.muted },
});
