import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import type { AdapterSearchResponse } from "src/types/AdapterSearchResponse";
import type { SearchFacet } from "src/types/SearchFacet";

/**
 * Returns an exact zero-match response without calling a provider. Requested
 * facets are empty and exhaustive; the previous page remains navigable.
 * Provider timing and an omitted native response are null.
 *
 * @example
 * ```ts
 * if (request.filter.type === "constant" && !request.filter.value) {
 *   return emptySearchResponse(request);
 * }
 * ```
 */
// Separate signatures keep an absent payload null without promising a generic
// native type the caller never supplied. The implementation erases that relation.
export function emptySearchResponse<TNativeHit = never>(
  request: Pick<AdapterSearchRequest<unknown>, "page" | "facets">,
): AdapterSearchResponse<TNativeHit, null>;
export function emptySearchResponse<
  TNativeHit = never,
  TNativeResponse = unknown,
>(
  request: Pick<AdapterSearchRequest<unknown>, "page" | "facets">,
  native: TNativeResponse,
): AdapterSearchResponse<TNativeHit, TNativeResponse>;
export function emptySearchResponse(
  request: Pick<AdapterSearchRequest<unknown>, "page" | "facets">,
  ...payload: readonly unknown[]
): AdapterSearchResponse<unknown, unknown> {
  return {
    hits: [],
    page: {
      kind: "page",
      current: request.page.current,
      size: request.page.size,
      next: null,
      previous: request.page.current > 1 ? request.page.current - 1 : null,
    },
    total: { value: 0, accuracy: "exact", scope: "matches" },
    facets: Object.fromEntries(
      request.facets.map((field): [string, SearchFacet<unknown>] => [
        field,
        { field, values: [], exhaustive: true, native: null },
      ]),
    ),
    took: null,
    native: payload.length === 0 ? null : payload[0],
  };
}
