import type React from "react";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  ACCURACY_LABELS,
  ACCURACY_MEANINGS,
  STATUS_LABELS,
} from "examples/shared/outpost/constants/labels";
import { formatError } from "examples/shared/outpost/formatting/formatError";
import { formatNextPage } from "examples/shared/outpost/formatting/formatNextPage";
import { formatSearchCode } from "examples/shared/outpost/formatting/formatSearchCode";
import { formatTook } from "examples/shared/outpost/formatting/formatTook";
import { formatTotal } from "examples/shared/outpost/formatting/formatTotal";
import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { getLatestPage } from "examples/shared/outpost/utils/getLatestPage";
import {
  ACCURACY_TONES,
  STATUS_TONES,
} from "examples/shared/ui/constants/tones";
import { Badge } from "src/components/Badge/Badge";
import { Card } from "src/components/Card/Card";
import { SearchCode } from "src/components/SearchCode/SearchCode";
import type { StoreQuery } from "src/types/StoreQuery";
import { COLORS } from "src/utils/constants/colors";

type LatestSearchProps = {
  state: StoreState;
  query: StoreQuery;
  status: SearchStatus;
};

type FactProps = { label: string; children: ReactNode };

const Fact: React.FunctionComponent<FactProps> = ({ label, children }) => (
  <View style={styles.fact}>
    <Text style={styles.factLabel}>{label}</Text>
    <View style={styles.factValue}>{children}</View>
  </View>
);

type FactsProps = Omit<LatestSearchProps, "status" | "state">;

const Facts: React.FunctionComponent<FactsProps> = ({ query }) => {
  if (query.error !== null) {
    return (
      <Fact label="Failed">
        <Text style={styles.text}>{formatError(query.error)}</Text>
      </Fact>
    );
  }

  const latest = getLatestPage(query);

  if (latest === null) {
    return <Text style={styles.muted}>Waiting for the engine…</Text>;
  }

  return (
    <View style={styles.facts}>
      <Fact label="Total">
        <View style={styles.inline}>
          <Text style={styles.strong}>{formatTotal(latest.total)}</Text>
          <Badge
            tone={ACCURACY_TONES[latest.total.accuracy]}
            label={ACCURACY_LABELS[latest.total.accuracy]}
          />
        </View>
        <Text style={styles.muted}>
          {ACCURACY_MEANINGS[latest.total.accuracy]}
        </Text>
      </Fact>
      <Fact label="Next page">
        <Text style={styles.text}>{formatNextPage(latest.page.next)}</Text>
      </Fact>
      <Fact label="Took">
        <Text style={styles.text}>{formatTook(latest.took)}</Text>
      </Fact>
    </View>
  );
};

export const LatestSearch: React.FunctionComponent<LatestSearchProps> = ({
  state,
  query,
  status,
}) => (
  <Card
    title="Latest search"
    description="The search the store just ran: the code that built it, what came back, and how sure the engine was."
    aside={<Badge tone={STATUS_TONES[status]} label={STATUS_LABELS[status]} />}
  >
    <SearchCode code={formatSearchCode(state.engine, state)} />
    <Facts query={query} />
  </Card>
);

const styles = StyleSheet.create({
  facts: { gap: 10 },
  fact: { gap: 4 },
  factLabel: { fontSize: 12, fontWeight: "500", color: COLORS.muted },
  factValue: { gap: 4 },
  inline: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  strong: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  text: { fontSize: 14, color: COLORS.body },
  muted: { fontSize: 13, color: COLORS.muted },
});
