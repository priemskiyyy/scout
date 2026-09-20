import {
  createSearchAdapter,
  emptySearchResponse,
  matchesFilter,
  resolveConfigured,
} from "@priemskiyyy/scout";
import type {
  AdapterSearchRequest,
  AdapterSearchResponse,
} from "@priemskiyyy/scout";
import type { FuseAdapterOptions } from "src/types/FuseAdapterOptions";
import type { FuseHit } from "src/types/FuseHit";
import { highlightsFor } from "src/utils/highlightsFor";

/**
 * Adapts an application-owned Fuse instance. Matching and ordering are configured
 * on that instance; named sorts and profiles alias its configuration.
 *
 * @example
 * ```ts
 * const adapter = fuse({
 *   index: new Fuse(products, { keys: ["title"], includeMatches: true }),
 *   revision: () => catalogueVersion,
 *   sorts: { relevance: null },
 *   profiles: { default: null },
 * });
 * ```
 */
export const fuse = <TDocument, TSort extends string, TProfile extends string>(
  options: FuseAdapterOptions<TDocument, TSort, TProfile>,
) =>
  createSearchAdapter({
    name: "fuse",
    native: options.index,
    sorts: options.sorts,
    profiles: options.profiles,
    capabilities: {
      filters: {
        eq: true,
        neq: true,
        in: true,
        notIn: true,
        comparison: true,
        between: true,
        booleanComposition: true,
      },
      pagination: { maxPageSize: null },
      facets: { resultScoped: false },
      highlights: options.index.options.includeMatches ? "parts" : "none",
      cancellation: "logical",
    },
    fingerprint: () => `fuse:${String(options.revision())}`,
    search: async (
      request: AdapterSearchRequest<never>,
    ): Promise<
      AdapterSearchResponse<
        FuseHit<TDocument>,
        readonly FuseHit<TDocument>[] | null
      >
    > => {
      resolveConfigured(options.sorts, request.sort, {
        adapter: "fuse",
        kind: "sorts",
      });
      resolveConfigured(options.profiles, request.profile, {
        adapter: "fuse",
        kind: "profiles",
      });
      if (request.filter.type === "constant" && !request.filter.value) {
        return emptySearchResponse(request);
      }

      const native = options.index.search(request.query);
      // Fuse returns every match. Filtering before slicing preserves exact totals
      // and keeps matching documents on later pages reachable.
      const results = native.filter((hit) =>
        matchesFilter(request.filter, hit.item),
      );
      const start = (request.page.current - 1) * request.page.size;
      const end = start + request.page.size;

      return {
        hits: results.slice(start, end).map((hit) => ({
          document: hit.item,
          highlights: highlightsFor(hit, request.highlights),
          native: hit,
        })),
        page: {
          kind: "page",
          current: request.page.current,
          size: request.page.size,
          next: end < results.length ? request.page.current + 1 : null,
          previous: request.page.current > 1 ? request.page.current - 1 : null,
        },
        total: { value: results.length, accuracy: "exact", scope: "matches" },
        facets: {},
        took: null,
        native,
      };
    },
  });
