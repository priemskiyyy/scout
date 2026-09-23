import type React from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { Button } from "src/components/Button/Button";
import { COLORS } from "src/utils/constants/colors";

type SearchFieldProps = {
  value: string;
  searching: boolean;
  onChange: (value: string) => void;
  onStopPress: () => void;
};

export const SearchField: React.FunctionComponent<SearchFieldProps> = ({
  value,
  searching,
  onChange,
  onStopPress,
}) => (
  <View style={styles.field}>
    <TextInput
      accessibilityLabel="Search the store"
      placeholder="Search tents, boots, stoves…"
      placeholderTextColor={COLORS.faint}
      value={value}
      onChangeText={onChange}
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      style={styles.input}
    />
    {searching ? (
      <Button label="Stop" variant="secondary" onPress={onStopPress} />
    ) : null}
    {value === "" ? null : (
      <Button label="Clear" variant="secondary" onPress={() => onChange("")} />
    )}
  </View>
);

const styles = StyleSheet.create({
  field: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1,
    minWidth: 0,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    fontSize: 16,
    color: COLORS.text,
  },
});
