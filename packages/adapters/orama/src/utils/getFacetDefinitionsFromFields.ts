import { ScoutError } from "@priemskiyyy/scout";

import type { OramaFacetDefinition } from "src/types/OramaFacetDefinition";
import { getDeclaredKind } from "src/utils/getDeclaredKind";

/**
 * Orama's `facets` for the fields a search asked to count. Orama counts a
 * number property into ranges, which a Scout facet does not carry, so one is
 * refused.
 *
 * @example
 * ```ts
 * getFacetDefinitionsFromFields(db.schema, ["brand"]); // { brand: {} }
 * ```
 */
export const getFacetDefinitionsFromFields = (
  schema: Readonly<Record<string, unknown>>,
  fields: readonly string[],
): Readonly<Record<string, OramaFacetDefinition>> => {
  const definitions: Record<string, OramaFacetDefinition> = {};

  for (const field of fields) {
    const kind = getDeclaredKind(schema, field);

    if (kind === null) {
      throw new ScoutError({
        code: "configuration",
        message: `The Orama schema does not declare ${field}.`,
      });
    }

    if (kind === "number" || kind === "number[]") {
      throw new ScoutError({
        code: "unsupported-feature",
        message: `Orama counts ${field} into ranges, which a Scout facet does not carry.`,
      });
    }

    definitions[field] = {};
  }

  return definitions;
};
