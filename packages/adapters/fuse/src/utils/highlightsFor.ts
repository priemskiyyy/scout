import type { HighlightFragment, HighlightPart } from "@priemskiyyy/scout";
import type { FuseHit } from "src/types/FuseHit";
import type { FuseMatch } from "src/types/FuseMatch";

const splitsSurrogate = (text: string, position: number): boolean => {
  const previous = text.charCodeAt(position - 1);
  const current = text.charCodeAt(position);
  return (
    previous >= 0xd800 &&
    previous <= 0xdbff &&
    current >= 0xdc00 &&
    current <= 0xdfff
  );
};

const partsFor = (
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
      splitsSurrogate(text, start) ||
      splitsSurrogate(text, end)
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

const fieldValue = (document: unknown, field: string): unknown => {
  if (typeof document !== "object" || document === null) {
    return undefined;
  }
  return Object.getOwnPropertyDescriptor(document, field)?.value;
};

/** Match metadata only marks the original value; it can never replace its text. */
export const highlightsFor = (
  hit: FuseHit<unknown>,
  fields: readonly string[],
): Readonly<Record<string, readonly HighlightFragment[]>> =>
  Object.fromEntries(
    fields.map((field) => {
      const value = fieldValue(hit.item, field);
      const repeated = Array.isArray(value);
      const values: readonly unknown[] = repeated ? value : [value];
      const fragments = values.flatMap(
        (text, position): HighlightFragment[] => {
          if (typeof text !== "string") {
            return [];
          }
          const match = hit.matches?.find(
            (candidate) =>
              candidate.key === field &&
              candidate.refIndex === (repeated ? position : undefined),
          );
          return [
            {
              path: repeated ? [field, position] : [field],
              parts: partsFor(text, match),
              truncated: false,
            },
          ];
        },
      );
      return [field, fragments];
    }),
  );
