import type { HighlightFragment } from "@priemskiyyy/scout";

import type { FuseHit } from "src/types/FuseHit";
import { getFieldValue } from "src/utils/getFieldValue";
import { getHighlightPartsFromMatch } from "src/utils/getHighlightPartsFromMatch";

/**
 * The fragments of one field of one hit. Fuse matches an array field element
 * by element, so the element is part of the path.
 *
 * @example
 * ```ts
 * getHighlightFragmentsFromHit(hit, "tags"); // [{ path: ["tags", 0], ... }]
 * ```
 */
export const getHighlightFragmentsFromHit = (
  hit: FuseHit<unknown>,
  field: string,
): readonly HighlightFragment[] => {
  const value = getFieldValue(hit.item, field);

  if (Array.isArray(value)) {
    const elements: readonly unknown[] = value;

    return elements.flatMap((text, position): HighlightFragment[] => {
      if (typeof text !== "string") {
        return [];
      }

      const match = hit.matches?.find(
        (candidate) =>
          candidate.key === field && candidate.refIndex === position,
      );

      return [
        {
          path: [field, position],
          parts: getHighlightPartsFromMatch(text, match),
          truncated: false,
        },
      ];
    });
  }

  if (typeof value !== "string") {
    return [];
  }

  const match = hit.matches?.find(
    (candidate) => candidate.key === field && candidate.refIndex === undefined,
  );

  return [
    {
      path: [field],
      parts: getHighlightPartsFromMatch(value, match),
      truncated: false,
    },
  ];
};
