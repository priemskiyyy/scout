import { ScoutError } from "@priemskiyyy/scout";

import type { MiniSearchOptions } from "src/types/MiniSearchOptions";
import type { MiniSearchResult } from "src/types/MiniSearchResult";
import { RESULT_METADATA } from "src/utils/constants/results";

/**
 * The application document behind one result. A result carries only the
 * fields in `storeFields`, so without a resolver those and the id are the
 * document.
 *
 * @example
 * ```ts
 * getDocumentFromResult(result, undefined); // { id: "p1", title: "Running shoe", ... }
 * ```
 */
export const getDocumentFromResult = (
  result: MiniSearchResult,
  resolve: MiniSearchOptions["resolve"],
): unknown => {
  const stored = Object.fromEntries(
    Object.entries(result).filter(([key]) => !RESULT_METADATA.includes(key)),
  );

  if (typeof resolve === "function") {
    return resolve(result.id, stored);
  }

  // Said here, an instance that stores nothing is the configuration mistake
  // it is rather than a schema failure listing every missing field.
  if (Object.keys(stored).length === 0) {
    throw new ScoutError({
      code: "configuration",
      message:
        `MiniSearch stored no fields for document ${String(result.id)}. A ` +
        `result carries only the fields in storeFields, so list every ` +
        `schema field there or pass resolve to build the document.`,
    });
  }

  return { id: result.id, ...stored };
};
