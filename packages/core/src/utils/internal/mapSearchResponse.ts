import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import type { AdapterSearchResponse } from "src/types/AdapterSearchResponse";
import type { HighlightFragment } from "src/types/HighlightFragment";
import type { SearchFacet } from "src/types/SearchFacet";
import type { SearchHit } from "src/types/SearchHit";
import type { SearchResult } from "src/types/SearchResult";
import { decodeFacetValue } from "src/utils/internal/decodeFacetValue";
import { getSearchPage } from "src/utils/internal/getSearchPage";
import { getOwnValue } from "src/utils/internal/getOwnValue";
import type { IndexRuntime } from "src/utils/internal/IndexRuntime";
import { validateDocument } from "src/utils/internal/validateDocument";
import { ScoutError } from "src/utils/ScoutError";

// The engine's own processing time when it reported one, else what the core measured.
const getTook = (
  took: number | null,
  elapsed: number,
): SearchResult<unknown>["took"] => {
  if (took === null) {
    return { milliseconds: elapsed, source: "scout" };
  }

  return { milliseconds: took, source: "provider" };
};

const getFacets = (
  runtime: IndexRuntime,
  request: AdapterSearchRequest<unknown>,
  response: AdapterSearchResponse<unknown, unknown>,
) =>
  Object.fromEntries<SearchFacet<unknown>>(
    request.facets.map((field) => {
      const facet = getOwnValue(response.facets, field);

      // A facet the engine skipped stays present, with its counting unknown.
      if (facet === undefined) {
        return [
          field,
          { field, values: [], exhaustive: "unknown", native: null },
        ];
      }

      const type = getOwnValue(runtime.declaration.facetable, field);

      return [
        field,
        {
          field,
          values: facet.values.map((bucket) => ({
            value: decodeFacetValue({
              adapter: runtime.adapter.name,
              field,
              // Resolution refuses an undeclared facet, so this is only a guard.
              type: type ?? "string",
              value: bucket.value,
            }),
            count: bucket.count,
          })),
          exhaustive: facet.exhaustive,
          native: facet.native,
        },
      ];
    }),
  );

/**
 * Turns one adapter response into the result an application reads: documents
 * validated and identified, requested highlights and facets always present,
 * facet values decoded, and the page derived.
 */
export const mapSearchResponse = ({
  runtime,
  request,
  response,
  elapsed,
}: {
  runtime: IndexRuntime;
  request: AdapterSearchRequest<unknown>;
  response: AdapterSearchResponse<unknown, unknown>;
  /** What the core measured, used only when the provider reported no time. */
  elapsed: number;
}): SearchResult<unknown, Record<string, unknown>, string> => {
  const { declaration } = runtime;
  const hits: SearchHit<unknown, string, unknown>[] = [];
  let skipped = 0;

  for (const raw of response.hits) {
    const checked = validateDocument(declaration.schema, raw.document);

    if (checked.issues !== undefined) {
      if (declaration.validate === "skip") {
        skipped += 1;

        continue;
      }

      const issues = checked.issues.map((issue) => issue.message).join("; ");

      throw new ScoutError({
        code: "validation",
        message:
          `A document from ${request.index} did not match its schema. Set ` +
          `validate: "skip" on the index to drop such documents instead. The ` +
          `schema said: ${issues}`,
        cause: checked.issues,
      });
    }

    const highlights = Object.fromEntries<readonly HighlightFragment[]>(
      request.highlights.map((field) => {
        // Missing fields stay present and empty, including prototype names.
        return [field, getOwnValue(raw.highlights, field) ?? []];
      }),
    );

    hits.push({
      id: declaration.id(checked.value),
      document: checked.value,
      highlights,
      native: raw.native,
    });
  }

  return {
    hits,
    page: getSearchPage(
      request.page,
      response.total,
      response.hits.length,
      response.retrievable,
    ),
    total: response.total,
    facets: getFacets(runtime, request, response),
    skipped,
    took: getTook(response.took, elapsed),
    native: response.native,
  };
};

/**
 * The answer to a filter that can match nothing, given without asking the
 * engine: no hits, an exact zero, and every requested facet empty and
 * exhaustive, because an empty set is counted completely.
 */
export const getEmptySearchResult = (
  request: AdapterSearchRequest<unknown>,
  elapsed: number,
): SearchResult<unknown, Record<string, unknown>, string> => ({
  hits: [],
  page: getSearchPage(
    request.page,
    { value: 0, accuracy: "exact", scope: "matches" },
    0,
  ),
  total: { value: 0, accuracy: "exact", scope: "matches" },
  facets: Object.fromEntries<SearchFacet<unknown>>(
    request.facets.map((field) => [
      field,
      { field, values: [], exhaustive: true, native: null },
    ]),
  ),
  skipped: 0,
  took: { milliseconds: elapsed, source: "scout" },
  native: null,
});
