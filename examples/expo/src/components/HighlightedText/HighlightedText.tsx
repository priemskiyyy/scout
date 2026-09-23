import type { HighlightFragment } from "@priemskiyyy/scout";
import type React from "react";
import type { StyleProp, TextStyle } from "react-native";
import { StyleSheet, Text } from "react-native";

import { COLORS } from "src/utils/constants/colors";

type HighlightedTextProps = {
  fragments: readonly HighlightFragment[] | null;
  text: string;
  style: StyleProp<TextStyle>;
  numberOfLines?: number;
};

/**
 * A highlighted value, drawn from Scout's parts as nested text. A part is
 * text, never markup, so a document that carries a tag shows the tag.
 */
export const HighlightedText: React.FunctionComponent<HighlightedTextProps> = ({
  fragments,
  text,
  style,
  numberOfLines,
}) => {
  const [fragment] = fragments ?? [];

  if (fragment === undefined) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {fragment.parts.map((part, index) => {
        if (!part.matched) {
          return part.text;
        }

        return (
          <Text key={index} style={styles.mark}>
            {part.text}
          </Text>
        );
      })}
    </Text>
  );
};

const styles = StyleSheet.create({
  mark: {
    fontWeight: "700",
    color: COLORS.accentText,
    backgroundColor: COLORS.mark,
  },
});
