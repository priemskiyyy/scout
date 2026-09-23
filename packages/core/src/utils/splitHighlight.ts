import type { HighlightMarkers } from "src/types/HighlightMarkers";
import type { HighlightPart } from "src/types/HighlightPart";

const pushPart = (
  parts: HighlightPart[],
  text: string,
  matched: boolean,
): void => {
  if (text.length === 0) {
    return;
  }

  parts.push({ text, matched });
};

/**
 * Splits marker-wrapped text into matched and unmatched parts. Malformed or
 * nested markers degrade to one unmatched part with all markers removed.
 * The ASCII markers from `createHighlightMarkers` preserve Unicode boundaries.
 *
 * @example
 * ```ts
 * splitHighlight(`a ${markers.open}b${markers.close}`, markers);
 * // [{ text: "a ", matched: false }, { text: "b", matched: true }]
 * ```
 */
export const splitHighlight = (
  value: string,
  markers: HighlightMarkers,
): readonly HighlightPart[] => {
  // Most highlights are valid, so strip markers only when parsing fails.
  const getPlainParts = (): readonly HighlightPart[] => [
    {
      text: value.split(markers.open).join("").split(markers.close).join(""),
      matched: false,
    },
  ];

  // Empty markers prevent the scan from advancing.
  if (markers.open.length === 0 || markers.close.length === 0) {
    return getPlainParts();
  }

  const parts: HighlightPart[] = [];
  let cursor = 0;
  let open = value.indexOf(markers.open);

  while (open !== -1) {
    const from = open + markers.open.length;
    const close = value.indexOf(markers.close, from);

    if (close === -1) {
      return getPlainParts();
    }

    pushPart(parts, value.slice(cursor, open), false);
    pushPart(parts, value.slice(from, close), true);
    cursor = close + markers.close.length;
    open = value.indexOf(markers.open, cursor);
  }

  pushPart(parts, value.slice(cursor), false);

  // Leftover markers indicate a nested pair or stray close.
  const leaked = parts.some(
    (part) =>
      part.text.includes(markers.open) || part.text.includes(markers.close),
  );

  if (leaked || parts.length === 0) {
    return getPlainParts();
  }

  return parts;
};
