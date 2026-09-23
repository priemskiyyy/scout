import type React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import type { CodeToken } from "examples/shared/outpost/types/CodeToken";
import { getCodeTokens } from "examples/shared/outpost/utils/getCodeTokens";
import { COLORS } from "src/utils/constants/colors";

type SearchCodeProps = { code: string };

const TOKEN_COLORS: Record<CodeToken["kind"], string> = {
  string: COLORS.codeString,
  call: "#7dd3fc",
  plain: COLORS.codeText,
};

export const SearchCode: React.FunctionComponent<SearchCodeProps> = ({
  code,
}) => (
  <ScrollView
    horizontal
    accessibilityLabel="The search, as code"
    style={styles.block}
    contentContainerStyle={styles.content}
  >
    <Text style={styles.code}>
      {getCodeTokens(code).map((token, index) => (
        <Text key={index} style={{ color: TOKEN_COLORS[token.kind] }}>
          {token.text}
        </Text>
      ))}
    </Text>
  </ScrollView>
);

const styles = StyleSheet.create({
  block: { borderRadius: 12, backgroundColor: COLORS.code },
  content: { padding: 12 },
  code: { fontFamily: "Menlo", fontSize: 12, lineHeight: 18 },
});
