import type { AdapterSearchRequest } from "@priemskiyyy/scout";
import type { ScoutWireRequest } from "src/types/ScoutWireRequest";

/**
 * Encodes the portable request for a backend using Scout's wire format.
 * Pair with `scoutWireResponse` in the HTTP adapter.
 *
 * @example
 * ```ts
 * http({
 *   endpoint: "https://api.example.com/search",
 *   capabilities,
 *   sorts: { relevance: null },
 *   profiles: { default: null },
 *   toRequest: scoutWireRequest,
 *   fromResponse: scoutWireResponse,
 * });
 * ```
 */
export const scoutWireRequest = <TNativeOptions>(
  request: AdapterSearchRequest<TNativeOptions>,
): ScoutWireRequest => ({
  index: request.index,
  query: request.query,
  profile: request.profile,
  sort: request.sort,
  filter: request.filter,
  facets: request.facets,
  highlights: request.highlights,
  page: { current: request.page.current, size: request.page.size },
  provider: request.provider,
});
