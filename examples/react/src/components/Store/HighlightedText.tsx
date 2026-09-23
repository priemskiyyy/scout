import type { HighlightFragment } from "@priemskiyyy/scout";
import type React from "react";

type HighlightedTextProps = {
  fragments: readonly HighlightFragment[] | null;
  text: string;
};

/**
 * A highlighted value, drawn from Scout's parts. A part is text, never
 * markup, so a document that carries a tag shows the tag.
 */
export const HighlightedText: React.FunctionComponent<HighlightedTextProps> = ({
  fragments,
  text,
}) => {
  const [fragment] = fragments ?? [];

  if (fragment === undefined) {
    return text;
  }

  return fragment.parts.map((part, index) => {
    if (!part.matched) {
      return part.text;
    }

    return (
      <mark
        key={index}
        className="rounded bg-amber-200/80 px-0.5 text-inherit dark:bg-amber-500/30"
      >
        {part.text}
      </mark>
    );
  });
};
