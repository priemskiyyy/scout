import { SearchValidationError } from "src/errors/SearchValidationError";
import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import type { AdapterSearchResponse } from "src/types/AdapterSearchResponse";
import type { HighlightFragment } from "src/types/HighlightFragment";
import type { SearchFacet } from "src/types/SearchFacet";
import type { SearchHit } from "src/types/SearchHit";
import type { IndexRuntime } from "src/utils/internal/IndexRuntime";
import { validateDocument } from "src/utils/internal/validateDocument";

/**
 * Turns one adapter response into the result an application reads.
 *
 * Mapping stays separate from dispatch so it can be tested without a provider
 * or a clock.
 *
 * @example
 * ```ts
 * const response = await runtime.adapter.search(request, { signal });
 * return mapSearchResponse({ runtime, request, response, elapsed: 12 });
 * ```
 */
export const mapSearchResponse = <TOptions, TDocument>({
  runtime,
  request,
  response,
  elapsed,
}: {
  runtime: IndexRuntime<TOptions, TDocument>;
  request: AdapterSearchRequest<TOptions>;
  response: AdapterSearchResponse<unknown, unknown>;
  /** What the core measured, used only when the provider reported no time. */
  elapsed: number;
}) => {
  const hits: SearchHit<TDocument, string, unknown>[] = [];
  let skipped = 0;
  for (const raw of response.hits) {
    const checked = validateDocument(runtime.schema, raw.document);
    if (typeof checked.issues !== "undefined") {
      if (runtime.validate === "skip") {
        skipped += 1;
        continue;
      }
      throw new SearchValidationError({
        index: request.index,
        issues: checked.issues.map((issue) => issue.message),
        message:
          `A document from ${request.index} did not match its schema. Set ` +
          `validate: "skip" on the index to drop such documents instead.`,
      });
    }
    const highlights = Object.fromEntries<readonly HighlightFragment[]>(
      request.highlights.map((field) => {
        const fragments = Object.hasOwn(raw.highlights, field)
          ? raw.highlights[field]
          : undefined;
        // Missing fields stay present and empty, including prototype names.
        return [field, fragments ?? []];
      }),
    );
    hits.push({
      id: runtime.identify(checked.value),
      document: checked.value,
      highlights,
      native: raw.native,
    });
  }

  const facets = Object.fromEntries<SearchFacet<unknown>>(
    request.facets.map((field) => {
      const facet = Object.hasOwn(response.facets, field)
        ? response.facets[field]
        : undefined;
      // Missing facets stay unknown, never a fabricated empty count.
      return [
        field,
        facet ?? { field, values: [], exhaustive: "unknown", native: null },
      ];
    }),
  );

  return {
    hits,
    page: response.page,
    total: response.total,
    facets,
    skipped,
    took:
      response.took === null
        ? { milliseconds: elapsed, source: "scout" as const }
        : { milliseconds: response.took, source: "provider" as const },
    native: response.native,
  };
};
