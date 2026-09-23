import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { LATENCY_OPTIONS } from "examples/shared/outpost/constants/labOptions";
import type { CatalogueBackend } from "examples/shared/outpost/types/CatalogueBackend";
import { Card } from "src/components/Card/Card";
import { LabSwitch } from "src/components/LabSwitch/LabSwitch";
import { SegmentedControl } from "src/components/SegmentedControl/SegmentedControl";
import { useValueStore } from "src/hooks/useValueStore";
import { COLORS } from "src/utils/constants/colors";

type LabProps = {
  backend: CatalogueBackend;
  disposed: boolean;
  emptySet: boolean;
  onEmptySetToggle: () => void;
  onDisposeToggle: () => void;
};

export const Lab: React.FunctionComponent<LabProps> = ({
  backend,
  disposed,
  emptySet,
  onEmptySetToggle,
  onDisposeToggle,
}) => {
  const state = useValueStore(backend.state);

  return (
    <Card
      title="Break the engine"
      description="Your API runs inside the app, so the lab can slow it down, take it offline or corrupt what it answers. Then search again."
    >
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>API latency</Text>
        <SegmentedControl
          label="API latency"
          options={LATENCY_OPTIONS}
          value={state.latency}
          onSelect={(latency) => backend.update({ latency })}
        />
      </View>
      <View>
        <LabSwitch
          label="API offline"
          description="Your API answers 503. The search fails as provider, after the one retry this app allows."
          value={state.offline}
          onToggle={() => backend.update({ offline: !state.offline })}
        />
        <LabSwitch
          label="Corrupt a document"
          description="The first hit's price becomes a string, and the Zod schema fails the search."
          value={state.corruptDocument}
          onToggle={() =>
            backend.update({ corruptDocument: !state.corruptDocument })
          }
        />
        <LabSwitch
          label="Ask for an empty set"
          description="Adds brand in nothing to the filter. Scout answers on its own and asks no engine."
          value={emptySet}
          onToggle={onEmptySetToggle}
        />
        <LabSwitch
          label="Dispose Scout"
          description="Every search is refused as disposed until Scout is started again."
          value={disposed}
          onToggle={onDisposeToggle}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "500", color: COLORS.body },
});
