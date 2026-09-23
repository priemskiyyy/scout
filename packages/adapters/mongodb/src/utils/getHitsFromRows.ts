import type { AdapterSearchHit } from "@priemskiyyy/scout";

import type { MongoSearchRow } from "src/types/MongoSearchRow";
import { getHighlightsFromRow } from "src/utils/getHighlightsFromRow";

/**
 * Every row of one search as a hit: the document without the metadata the
 * pipeline added, its requested highlights, and the whole row kept as
 * `native`.
 *
 * @example
 * ```ts
 * getHitsFromRows(rows, request.highlights);
 * ```
 */
export const getHitsFromRows = (
  rows: readonly MongoSearchRow[],
  requested: readonly string[],
): readonly AdapterSearchHit<MongoSearchRow>[] =>
  rows.map((row) => ({
    document: Object.fromEntries(
      Object.entries(row).filter(([key]) => key !== "__scout"),
    ),
    highlights: getHighlightsFromRow(row, requested),
    native: row,
  }));
