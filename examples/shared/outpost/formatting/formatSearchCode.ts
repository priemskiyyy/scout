import type { EngineId } from "examples/shared/outpost/types/EngineId";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { PAGE_SIZE } from "examples/shared/outpost/constants/store";
import { getFacetFields } from "examples/shared/outpost/utils/getFacetFields";
import { getHighlightFields } from "examples/shared/outpost/utils/getHighlightFields";
import { getStoreClauses } from "examples/shared/outpost/utils/getStoreClauses";

const formatArguments = (values: readonly string[]) =>
  values.map((value) => JSON.stringify(value)).join(", ");

const formatWhere = (codes: readonly string[]): string[] => {
  const [only] = codes;

  if (codes.length === 1 && only !== undefined) {
    return [`  .where((product) => ${only})`];
  }

  return [
    "  .where((product, { and }) =>",
    "    and(",
    ...codes.map((code) => `      ${code},`),
    "    ),",
    "  )",
  ];
};

/**
 * The TypeScript that builds the store's current search, call for call, as
 * `buildStoreSearch` builds it. Calls that would change nothing are left out.
 *
 * @example
 * ```ts
 * formatSearchCode("orama", initialStoreState);
 * // scout.index("orama")
 * //   .search("tent")
 * //   ...
 * ```
 */
export const formatSearchCode = (engine: EngineId, state: StoreState) => {
  const lines = [
    `scout.index(${JSON.stringify(engine)})`,
    `  .search(${JSON.stringify(state.query)})`,
  ];

  if (state.profile !== "default") {
    lines.push(`  .profile(${JSON.stringify(state.profile)})`);
  }

  const clauses = getStoreClauses(state);

  if (clauses.length > 0) {
    lines.push(...formatWhere(clauses.map((clause) => clause.code)));
  }

  if (state.sort !== "relevance") {
    lines.push(`  .sort(${JSON.stringify(state.sort)})`);
  }

  const facets = getFacetFields(state);

  if (facets.length > 0) {
    lines.push(`  .facets(${formatArguments(facets)})`);
  }

  const highlights = getHighlightFields(state);

  if (highlights.length > 0) {
    lines.push(`  .highlight(${formatArguments(highlights)})`);
  }

  lines.push(`  .page({ size: ${PAGE_SIZE} })`);

  return lines.join("\n");
};
