import {
  createHighlightMarkers,
  createSearchAdapter,
  emptySearchResponse,
  parseFacetValue,
  resolveConfigured,
  splitHighlight,
} from "@priemskiyyy/scout";
import type {
  AdapterSearchHit,
  AdapterSearchRequest,
  AdapterSearchResponse,
  FacetValueType,
  HighlightFragment,
  HighlightMarkers,
  SearchCapabilities,
  SearchFacet,
  SearchPage,
  SearchTotal,
} from "@priemskiyyy/scout";
import { translateFilter } from "src/utils/translateFilter";

import type { MeilisearchSearchOptions } from "src/types/MeilisearchSearchOptions";
import type { MeilisearchSearchParams } from "src/types/MeilisearchSearchParams";
import type { MeilisearchSearchHit } from "src/types/MeilisearchSearchHit";
import type { MeilisearchSearchResponse } from "src/types/MeilisearchSearchResponse";
import type { MeilisearchProfiles } from "src/types/MeilisearchProfiles";
import type { MeilisearchSorts } from "src/types/MeilisearchSorts";
import type { MeilisearchAdapterOptions } from "src/types/MeilisearchAdapterOptions";

/** Meilisearch's default `pagination.maxTotalHits`. */
const DEFAULT_MAX_TOTAL_HITS = 1000;

/** The keys Meilisearch adds to a hit, which are not part of the document. */
const HIT_METADATA_KEYS = [
  "_formatted",
  "_matchesPosition",
  "_rankingScore",
  "_rankingScoreDetails",
  "_federation",
  "_vectors",
];

/** Provider option keys that would collide with a Scout owned field. */
const RESERVED_OPTIONS = [
  "filter",
  "q",
  "page",
  "hitsPerPage",
  "offset",
  "limit",
  "sort",
  "facets",
  "attributesToHighlight",
  "highlightPreTag",
  "highlightPostTag",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const buildFragments = (
  formatted: unknown,
  field: string,
  markers: HighlightMarkers,
  truncated: boolean | "unknown",
): readonly HighlightFragment[] => {
  const value = isRecord(formatted) ? formatted[field] : undefined;
  if (typeof value === "string") {
    return [
      { path: [field], parts: splitHighlight(value, markers), truncated },
    ];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry, position) =>
      typeof entry === "string"
        ? [
            {
              path: [field, position],
              parts: splitHighlight(entry, markers),
              truncated,
            },
          ]
        : [],
    );
  }
  // Meilisearch formats scalars as strings and nests objects. Anything else
  // carries no highlight this adapter can read, so the field reports none and
  // the core fills in an empty list.
  return [];
};

const toDocument = (hit: MeilisearchSearchHit): unknown =>
  Object.fromEntries(
    Object.entries(hit).filter(([key]) => !HIT_METADATA_KEYS.includes(key)),
  );

const translateHit = (
  hit: MeilisearchSearchHit,
  fields: readonly string[],
  markers: HighlightMarkers,
  truncated: boolean | "unknown",
): AdapterSearchHit<MeilisearchSearchHit> => ({
  document: toDocument(hit),
  highlights: Object.fromEntries(
    fields.map((field) => [
      field,
      buildFragments(hit._formatted, field, markers, truncated),
    ]),
  ),
  native: hit,
});

const translateFacets = (
  fields: readonly string[],
  response: MeilisearchSearchResponse,
  types: ReadonlyMap<string, FacetValueType>,
): Readonly<Record<string, SearchFacet<unknown>>> => {
  const entries = fields.map(
    (field): readonly [string, SearchFacet<unknown>] => {
      const distribution = response.facetDistribution?.[field] ?? null;
      const stats = response.facetStats?.[field] ?? null;
      return [
        field,
        {
          field,
          values:
            distribution === null
              ? []
              : Object.entries(distribution).map(([value, count]) => ({
                  value: parseFacetValue({
                    adapter: "meilisearch",
                    field,
                    value,
                    type: types.get(field) ?? "string",
                  }),
                  count,
                })),
          // Meilisearch never says whether a distribution was cut short by
          // maxValuesPerFacet, so the adapter does not claim it was complete.
          exhaustive: "unknown",
          native: { distribution, stats },
        },
      ];
    },
  );
  return Object.fromEntries(entries);
};

const translateTotal = (
  response: MeilisearchSearchResponse,
  pagination: "page" | "offset",
  maxTotalHits: number,
): SearchTotal => {
  if (pagination === "offset") {
    const estimated = response.estimatedTotalHits;
    if (typeof estimated !== "number") {
      return { accuracy: "unknown", scope: "unknown" };
    }
    // Offset pagination reports an estimate by design, however small the
    // number is, so it is never promoted to exact.
    return { value: estimated, accuracy: "estimated", scope: "matches" };
  }
  const total = response.totalHits;
  if (typeof total !== "number") {
    return { accuracy: "unknown", scope: "unknown" };
  }
  if (total >= maxTotalHits) {
    // Page pagination counts exhaustively up to maxTotalHits and then stops, so
    // a total that reaches the cap says what pagination can reach rather than
    // how many documents matched.
    return { value: total, accuracy: "lower-bound", scope: "retrievable" };
  }
  return { value: total, accuracy: "exact", scope: "matches" };
};

const nextPage = (
  request: AdapterSearchRequest<MeilisearchSearchOptions>,
  response: MeilisearchSearchResponse,
  pagination: "page" | "offset",
  hits: number,
) => {
  if (pagination === "offset") {
    // A short page is the end of the results. A full one says nothing, because
    // estimatedTotalHits is an estimate and guessing from it invents a page.
    return hits < request.page.size ? null : "unknown";
  }
  const totalPages = response.totalPages;
  if (typeof totalPages !== "number") {
    return "unknown";
  }
  return request.page.current < totalPages ? request.page.current + 1 : null;
};

const translatePage = (
  request: AdapterSearchRequest<MeilisearchSearchOptions>,
  response: MeilisearchSearchResponse,
  pagination: "page" | "offset",
  hits: number,
): SearchPage => ({
  kind: "page",
  current: request.page.current,
  size: request.page.size,
  next: nextPage(request, response, pagination, hits),
  previous: request.page.current > 1 ? request.page.current - 1 : null,
});

const paginationParams = (
  request: AdapterSearchRequest<MeilisearchSearchOptions>,
  pagination: "page" | "offset",
): MeilisearchSearchParams =>
  pagination === "offset"
    ? {
        offset: (request.page.current - 1) * request.page.size,
        limit: request.page.size,
      }
    : { page: request.page.current, hitsPerPage: request.page.size };

const capabilitiesFor = (maxTotalHits: number): SearchCapabilities => ({
  filters: {
    eq: true,
    neq: true,
    in: true,
    notIn: true,
    comparison: true,
    between: true,
    booleanComposition: true,
  },
  // Meilisearch will not paginate past maxTotalHits, so that is the largest
  // page it can actually fill.
  pagination: { maxPageSize: maxTotalHits },
  facets: { resultScoped: true },
  highlights: "parts",
  cancellation: "transport",
});

/**
 * Adapts an injected Meilisearch index. Page mode reports capped counts as
 * lower bounds; offset mode reports estimates. Highlights use per-request
 * markers rather than UTF-8 byte offsets.
 *
 * @example
 * ```ts
 * import { Meilisearch } from "meilisearch";
 * import { meilisearch } from "@priemskiyyy/scout-meilisearch";
 *
 * const client = new Meilisearch({ host, apiKey });
 * const adapter = meilisearch({
 *   index: client.index("products"),
 *   profiles: { default: {}, titles: { attributesToSearchOn: ["title"] } },
 *   sorts: { relevance: {}, cheapest: { sort: ["price:asc"] } },
 * });
 * ```
 */
export const meilisearch = <
  TProfiles extends MeilisearchProfiles,
  TSorts extends MeilisearchSorts,
>(
  options: MeilisearchAdapterOptions<TProfiles, TSorts>,
) => {
  const facetTypes = new Map(Object.entries(options.facets ?? {}));
  const pagination = options.pagination ?? "page";
  const maxTotalHits = options.maxTotalHits ?? DEFAULT_MAX_TOTAL_HITS;

  return createSearchAdapter({
    name: "meilisearch",
    native: options.index,
    capabilities: capabilitiesFor(maxTotalHits),
    sorts: options.sorts,
    profiles: options.profiles,
    reservedOptions: RESERVED_OPTIONS,
    // The index uid identifies what was searched. An API key would land in the
    // query identity, and from there in cache keys and devtools.
    fingerprint: () => options.index.uid,
    search: async (
      request: AdapterSearchRequest<MeilisearchSearchOptions>,
      { signal },
    ): Promise<
      AdapterSearchResponse<
        MeilisearchSearchHit,
        MeilisearchSearchResponse | null
      >
    > => {
      const profile = resolveConfigured(options.profiles, request.profile, {
        adapter: "meilisearch",
        kind: "profiles",
      });
      const sort = resolveConfigured(options.sorts, request.sort, {
        adapter: "meilisearch",
        kind: "sorts",
      });

      const filter = translateFilter(request.filter);
      if (filter === false) {
        // A contradiction has one answer and Meilisearch cannot express it, so
        // the answer is given here rather than paid for over the network, and
        // there is no native response to hand back.
        return emptySearchResponse(request);
      }

      const markers = createHighlightMarkers();
      const params: MeilisearchSearchParams = {
        ...profile,
        ...(request.provider === null ? {} : request.provider),
        ...paginationParams(request, pagination),
        ...(typeof filter === "string" ? { filter } : {}),
        ...(sort.sort === undefined ? {} : { sort: [...sort.sort] }),
        ...(request.facets.length === 0 ? {} : { facets: [...request.facets] }),
        ...(request.highlights.length === 0
          ? {}
          : {
              attributesToHighlight: [...request.highlights],
              highlightPreTag: markers.open,
              highlightPostTag: markers.close,
            }),
      };

      // The query goes in the first argument, which is why `q` is reserved.
      const response = await options.index.search(request.query, params, {
        signal,
      });

      const hits = Array.isArray(response.hits) ? response.hits : [];
      // Meilisearch says nothing about whether it cut a value short, so a
      // cropped field admits it does not know and an uncropped one does.
      const truncated =
        Array.isArray(params.attributesToCrop) &&
        params.attributesToCrop.length > 0
          ? "unknown"
          : false;

      return {
        hits: hits.map((hit) =>
          translateHit(hit, request.highlights, markers, truncated),
        ),
        page: translatePage(request, response, pagination, hits.length),
        total: translateTotal(response, pagination, maxTotalHits),
        facets: translateFacets(request.facets, response, facetTypes),
        took:
          typeof response.processingTimeMs === "number"
            ? response.processingTimeMs
            : null,
        native: response,
      };
    },
  });
};
