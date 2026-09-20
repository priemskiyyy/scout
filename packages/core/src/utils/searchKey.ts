import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import { canonicalize } from "src/utils/internal/canonicalize";

/**
 * Builds a cache key from a normalised request and an adapter fingerprint.
 * Consumers normally call `builder.key()`; this form serves adapter tests and
 * devtools that already hold the request.
 * Fingerprints describe adapter configuration without including credentials.
 *
 * @example
 * ```ts
 * useQuery({ queryKey: search.key(), queryFn: ({ signal }) => search.execute({ signal }) });
 * ```
 */
export const searchKey = (
  request: AdapterSearchRequest<unknown>,
  fingerprint: string,
): readonly unknown[] => [
  "scout",
  request.index,
  canonicalize(
    // Ignore unrelated metadata attached to the request by callers.
    {
      fingerprint,
      index: request.index,
      query: request.query,
      profile: request.profile,
      sort: request.sort,
      filter: request.filter,
      facets: request.facets,
      highlights: request.highlights,
      page: request.page,
      provider: request.provider,
    },
    "search",
  ),
];
