import type { HighlightPart } from "@priemskiyyy/scout";

import type { FuseMatch } from "src/types/FuseMatch";

// Fuse reports UTF-16 offsets, so a range edge between the two halves of a
// surrogate pair would cut a character in half.
const isSplittingSurrogate = (text: string, position: number): boolean => {
  const previous = text.charCodeAt(position - 1);
  const current = text.charCodeAt(position);

  return (
    previous >= 0xd800 &&
    previous <= 0xdbff &&
    current >= 0xdc00 &&
    current <= 0xdfff
  );
};

/**
 * One text value as highlight parts, from the inclusive ranges of the Fuse
 * match that marked it. A range that cannot mark this exact text degrades the
 * whole value to plain text, so match metadata can never replace or corrupt
 * the document's text.
 *
 * @example
 * ```ts
 * getHighlightPartsFromMatch("shoe", { value: "shoe", indices: [[0, 3]] });
 * // [{ text: "shoe", matched: true }]
 * ```
 */
export const getHighlightPartsFromMatch = (
  text: string,
  match: FuseMatch | undefined,
): readonly HighlightPart[] => {
  const plain = [{ text, matched: false }];

  if (
    match === undefined ||
    match.value !== text ||
    match.indices.length === 0
  ) {
    return plain;
  }

  const parts: HighlightPart[] = [];
  let position = 0;

  for (const [start, inclusiveEnd] of match.indices) {
    const end = inclusiveEnd + 1;

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(inclusiveEnd) ||
      start < position ||
      end <= start ||
      end > text.length ||
      isSplittingSurrogate(text, start) ||
      isSplittingSurrogate(text, end)
    ) {
      return plain;
    }

    if (start > position) {
      parts.push({ text: text.slice(position, start), matched: false });
    }

    parts.push({ text: text.slice(start, end), matched: true });
    position = end;
  }

  if (position < text.length) {
    parts.push({ text: text.slice(position), matched: false });
  }

  return parts;
};
