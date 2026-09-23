import type { HighlightFragment } from "@priemskiyyy/scout";

import type { FuseHit } from "src/types/FuseHit";
import { getHighlightFragmentsFromHit } from "src/utils/getHighlightFragmentsFromHit";

/**
 * The requested fields of one hit as highlight parts, from the inclusive
 * ranges Fuse reports with `includeMatches`.
 *
 * @example
 * ```ts
 * getHighlightsFromHit({ item: { title: "shoe" }, refIndex: 0 }, ["title"]);
 * // { title: [{ path: ["title"], parts: [{ text: "shoe", matched: false }], truncated: false }] }
 * ```
 */
export const getHighlightsFromHit = (
  hit: FuseHit<unknown>,
  fields: readonly string[],
): Readonly<Record<string, readonly HighlightFragment[]>> =>
  Object.fromEntries(
    fields.map((field) => [field, getHighlightFragmentsFromHit(hit, field)]),
  );
