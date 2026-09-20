import type {
  AdapterSearchHit,
  AdapterSearchRequest,
  AdapterSearchResponse,
  FacetValueType,
  HighlightFragment,
  HighlightMarkers,
  SearchAdapter,
  SearchCapabilities,
  SearchFacet,
  SearchPage,
  SearchTotal,
} from "@priemskiyyy/scout";
import { translateFilter } from "src/utils/translateFilter";

import type { AlgoliaHit } from "src/types/AlgoliaHit";
import type { AlgoliaSearchResponse } from "src/types/AlgoliaSearchResponse";
import type { AlgoliaSearchParams } from "src/types/AlgoliaSearchParams";
import type { AlgoliaSearchClient } from "src/types/AlgoliaSearchClient";
import type { AlgoliaSort } from "src/types/AlgoliaSort";
import type { AlgoliaProfile } from "src/types/AlgoliaProfile";
import type { AlgoliaOptions } from "src/types/AlgoliaOptions";

import {
  createHighlightMarkers,
  createSearchAdapter,
  emptySearchResponse,
  resolveConfigured,
  parseFacetValue,
  SearchConfigurationError,
  splitHighlight,
} from "@priemskiyyy/scout";

/** Algolia's own hard cap on `hitsPerPage`. */
const MAX_PAGE_SIZE = 1000;

/** Algolia's default `paginationLimitedTo`. */
const DEFAULT_PAGINATION_LIMIT = 1000;

/** The keys Algolia adds to a hit, which are metadata rather than document. */
const HIT_METADATA_KEYS: readonly string[] = [
  "_highlightResult",
  "_snippetResult",
  "_rankingInfo",
  "_distinctSeqID",
];

const CAPABILITIES: SearchCapabilities = {
  filters: {
    eq: true,
    neq: true,
    in: true,
    notIn: true,
    comparison: true,
    between: true,
    booleanComposition: true,
  },
  pagination: { maxPageSize: MAX_PAGE_SIZE },
  facets: { resultScoped: true },
  highlights: "parts",
  // `@algolia/client-common` 5.59.0 contains no `AbortSignal`. Aborting stops
  // Scout waiting; the engine keeps computing and still bills for the query.
  cancellation: "logical",
};

/**
 * Provider parameters that would overwrite something Scout owns. An
 * application that sets one of these through `.provider()` is refused by the
 * core before dispatch, because the answer would no longer match the request
 * Scout canonicalised.
 */
const RESERVED_OPTIONS: readonly string[] = [
  "filters",
  "query",
  "page",
  "hitsPerPage",
  "facets",
  "attributesToHighlight",
  "highlightPreTag",
  "highlightPostTag",
  "numericFilters",
  "facetFilters",
  "tagFilters",
  // Both override `page` and `hitsPerPage` silently, which would make
  // `page.current` a lie about the hits that came back.
  "offset",
  "length",
];

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Walks one `_highlightResult` entry, which Algolia shapes as a value, a nested
 * object or an array, and reports where in the document each value sits.
 */
const collectFragments = (
  node: unknown,
  path: readonly (string | number)[],
  markers: HighlightMarkers,
): readonly HighlightFragment[] => {
  if (Array.isArray(node)) {
    return node.flatMap((element, position) =>
      collectFragments(element, [...path, position], markers),
    );
  }
  if (!isRecord(node)) {
    return [];
  }
  if (typeof node.value === "string") {
    return [
      {
        path,
        parts: splitHighlight(node.value, markers),
        // `_highlightResult` carries the whole attribute value. Truncation is
        // what `_snippetResult` does, and this adapter does not request it.
        truncated: false,
      },
    ];
  }
  return Object.entries(node).flatMap(([key, child]) =>
    collectFragments(child, [...path, key], markers),
  );
};

const translateHighlights = (
  hit: AlgoliaHit,
  requested: readonly string[],
  markers: HighlightMarkers,
): Readonly<Record<string, readonly HighlightFragment[]>> => {
  const result = hit._highlightResult;
  if (!isRecord(result)) {
    return {};
  }
  return Object.fromEntries(
    requested.map((field) => [
      field,
      collectFragments(result[field], [field], markers),
    ]),
  );
};

const toDocument = (hit: AlgoliaHit): Readonly<Record<string, unknown>> =>
  Object.fromEntries(
    Object.entries(hit).filter(([key]) => !HIT_METADATA_KEYS.includes(key)),
  );

const translateHit = (
  hit: AlgoliaHit,
  requested: readonly string[],
  markers: HighlightMarkers,
): AdapterSearchHit<AlgoliaHit> => ({
  document: toDocument(hit),
  highlights: translateHighlights(hit, requested, markers),
  native: hit,
});

/**
 * The last page an application can actually reach. Algolia refuses to serve a
 * hit past `paginationLimitedTo`, so a page beyond this one is empty even when
 * `nbHits` says there are matches left.
 */
const lastAccessiblePage = (
  nbPages: number,
  size: number,
  limit: number,
): number => {
  if (size <= 0) {
    return nbPages;
  }
  return Math.min(nbPages, Math.ceil(limit / size));
};

const translatePage = (
  response: AlgoliaSearchResponse,
  request: AdapterSearchRequest<AlgoliaSearchParams>,
  limit: number,
): SearchPage => {
  // Algolia pages are zero based, so page 0 is Scout's page 1.
  const current =
    typeof response.page === "number"
      ? response.page + 1
      : request.page.current;
  const size =
    typeof response.hitsPerPage === "number"
      ? response.hitsPerPage
      : request.page.size;
  const previous = current > 1 ? current - 1 : null;

  if (typeof response.nbPages !== "number") {
    return { kind: "page", current, size, next: "unknown", previous };
  }
  const last = lastAccessiblePage(response.nbPages, size, limit);
  return {
    kind: "page",
    current,
    size,
    next: current < last ? current + 1 : null,
    previous,
  };
};

/**
 * Algolia approximates `nbHits` whenever the query takes longer than about 50ms
 * or after roughly 10,000 exact matches, and says so in `exhaustive.nbHits`. A
 * missing flag means it said nothing, not that the count is exact.
 *
 * Past the pagination window the count is still a count of matches, and calling
 * it retrievable would promise pages that Algolia will not serve.
 */
const translateTotal = (
  response: AlgoliaSearchResponse,
  limit: number,
): SearchTotal => {
  const value = response.nbHits;
  if (typeof value !== "number") {
    return { accuracy: "unknown", scope: "unknown" };
  }
  const scope = value > limit ? "matches" : "retrievable";
  const exhaustive = response.exhaustive?.nbHits;
  if (typeof exhaustive !== "boolean") {
    return { accuracy: "unknown", scope };
  }
  return { value, accuracy: exhaustive ? "exact" : "estimated", scope };
};

const translateFacets = (
  response: AlgoliaSearchResponse,
  requested: readonly string[],
  types: ReadonlyMap<string, FacetValueType>,
): Readonly<Record<string, SearchFacet<unknown>>> => {
  const exhaustive = response.exhaustive?.facetValues;
  return Object.fromEntries(
    requested.map((field) => {
      const buckets = response.facets?.[field];
      return [
        field,
        {
          field,
          values: Object.entries(buckets ?? {}).map(([value, count]) => ({
            value: parseFacetValue({
              adapter: "algolia",
              field,
              value,
              type: types.get(field) ?? "string",
            }),
            count,
          })),
          exhaustive: typeof exhaustive === "boolean" ? exhaustive : "unknown",
          native: buckets ?? null,
        },
      ];
    }),
  );
};

/**
 * Adapts an injected Algolia client. Named sorts select primary or replica
 * indexes. Cancellation is logical because the SDK does not accept a signal.
 *
 * @example
 * ```ts
 * const products = index({
 *   schema: ProductSchema,
 *   id: (product) => product.objectID,
 *   filterable: ["brand", "price"],
 *   facetable: ["brand"],
 *   highlightable: ["title"],
 *   sorts: ["relevance", "priceAsc"],
 *   profiles: ["default"],
 *   adapter: algolia({
 *     client: algoliasearch(appId, searchOnlyKey),
 *     index: { name: "products" },
 *     sorts: {
 *       relevance: { index: { name: "products" } },
 *       priceAsc: { index: { name: "products_price_asc" } },
 *     },
 *     profiles: { default: {} },
 *   }),
 * });
 * ```
 */
export const algolia = <
  const TSorts extends Readonly<Record<string, AlgoliaSort>>,
  const TProfiles extends Readonly<Record<string, AlgoliaProfile>>,
>(
  options: AlgoliaOptions<TSorts, TProfiles>,
): SearchAdapter<
  AlgoliaSearchClient,
  AlgoliaSearchParams,
  AlgoliaHit,
  AlgoliaSearchResponse | null
> & { sorts: TSorts; profiles: TProfiles } => {
  const facetTypes = new Map(Object.entries(options.facets ?? {}));
  const limit = options.paginationLimitedTo ?? DEFAULT_PAGINATION_LIMIT;
  for (const [name, profile] of Object.entries(options.profiles)) {
    for (const key of RESERVED_OPTIONS) {
      if (Object.hasOwn(profile.searchParams ?? {}, key)) {
        throw new SearchConfigurationError({
          path: `profiles.${name}.searchParams.${key}`,
          message: `The algolia profile cannot set ${key}, because Scout owns that parameter.`,
        });
      }
    }
  }

  const buildSearchParams = (
    request: AdapterSearchRequest<AlgoliaSearchParams>,
    filters: string | true,
    markers: HighlightMarkers,
  ): AlgoliaSearchParams => ({
    ...(resolveConfigured(options.profiles, request.profile, {
      adapter: "algolia",
      kind: "profiles",
    }).searchParams ?? {}),
    ...(request.provider ?? {}),
    // Profiles are checked at construction and provider options at dispatch.
    query: request.query,
    page: request.page.current - 1,
    hitsPerPage: request.page.size,
    highlightPreTag: markers.open,
    highlightPostTag: markers.close,
    ...(filters === true ? {} : { filters }),
    ...(request.facets.length > 0 ? { facets: [...request.facets] } : {}),
    ...(request.highlights.length > 0
      ? { attributesToHighlight: [...request.highlights] }
      : {}),
  });

  const callAlgolia = async (
    indexName: string,
    searchParams: AlgoliaSearchParams,
  ): Promise<AlgoliaSearchResponse> => {
    if (options.cache === true) {
      return await options.client.searchSingleIndex({
        indexName,
        searchParams,
      });
    }
    // `searchSingleIndex` hardcodes `cacheable: true` and the transporter
    // reads it as `requestOptions.cacheable || request.cacheable`, so a per
    // request opt out is impossible. The HTTP info variant is the only search
    // call that never consults `requestsCache` or `responsesCache`.
    const answer = await options.client.searchSingleIndexWithHTTPInfo({
      indexName,
      searchParams,
    });
    return answer.data;
  };

  return createSearchAdapter({
    name: "algolia",
    native: options.client,
    capabilities: CAPABILITIES,
    sorts: options.sorts,
    profiles: options.profiles,
    reservedOptions: RESERVED_OPTIONS,
    // The replica mapping belongs in the identity: the same sort name over a
    // different replica is a different result set. An API key never does.
    fingerprint: () =>
      [
        options.index.name,
        ...Object.entries(options.sorts).map(
          ([name, sort]) => `${name}=${sort.index.name}`,
        ),
      ].join(" "),
    search: async (
      request: AdapterSearchRequest<AlgoliaSearchParams>,
    ): Promise<
      AdapterSearchResponse<AlgoliaHit, AlgoliaSearchResponse | null>
    > => {
      const filters = translateFilter(request.filter);
      if (filters === false) {
        // A contradiction has no Algolia spelling, and asking anyway would cost
        // a billed query to be told what the filter already said.
        // Nothing was asked of Algolia, so there is no native response.
        return emptySearchResponse(request);
      }
      const markers = createHighlightMarkers();
      const indexName = resolveConfigured(options.sorts, request.sort, {
        adapter: "algolia",
        kind: "sorts",
      }).index.name;
      const response = await callAlgolia(
        indexName,
        buildSearchParams(request, filters, markers),
      );

      return {
        hits: response.hits.map((hit) =>
          translateHit(hit, request.highlights, markers),
        ),
        page: translatePage(response, request, limit),
        total: translateTotal(response, limit),
        facets: translateFacets(response, request.facets, facetTypes),
        took:
          typeof response.processingTimeMS === "number"
            ? response.processingTimeMS
            : null,
        native: response,
      };
    },
  });
};
