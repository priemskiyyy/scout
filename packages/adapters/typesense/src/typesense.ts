import { translateFilter } from "src/utils/translateFilter";
import { refuse } from "src/utils/internal/refuse";
import type { TypesenseSearchParameters } from "src/types/TypesenseSearchParameters";
import type { TypesenseHighlight } from "src/types/TypesenseHighlight";
import type { TypesenseHit } from "src/types/TypesenseHit";
import type { TypesenseSearchResponse } from "src/types/TypesenseSearchResponse";
import type { TypesenseFacetType } from "src/types/TypesenseFacetType";
import type { TypesenseAdapterOptions } from "src/types/TypesenseAdapterOptions";
import type { TypesenseSearchAdapter } from "src/types/TypesenseSearchAdapter";
import {
  createHighlightMarkers,
  createSearchAdapter,
  emptySearchResponse,
  resolveConfigured,
  parseFacetValue,
  splitHighlight,
} from "@priemskiyyy/scout";
import type {
  AdapterSearchHit,
  AdapterSearchRequest,
  AdapterSearchResponse,
  HighlightFragment,
  HighlightMarkers,
  SearchCapabilities,
  SearchFacet,
  SearchPage,
  SearchTotal,
} from "@priemskiyyy/scout";

const ADAPTER_NAME = "typesense";

/** Typesense rejects a `per_page` above this, so the core refuses it earlier. */
const MAX_PAGE_SIZE = 250;

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
  // Typesense can search facet values through `facet_query` and can exclude a
  // facet's own filter through tagged filters. Neither is wired to a portable
  // request here, so neither is claimed.
  facets: { resultScoped: true },
  highlights: "parts",
  cancellation: "transport",
};

/** Every parameter the adapter writes itself, plus the one it refuses. */
const RESERVED_OPTIONS: readonly string[] = [
  "q",
  "query_by",
  "prefix",
  "filter_by",
  "sort_by",
  "facet_by",
  "page",
  "per_page",
  "highlight_fields",
  "highlight_start_tag",
  "highlight_end_tag",
  "group_by",
];

/**
 * Where a Typesense highlight entry keeps its marked text, and what that says
 * about truncation. Typesense reports a match by wrapping it rather than by
 * offset, so `splitHighlight` reads the markers this search asked for.
 */
const toFragments = (
  field: string,
  entry: TypesenseHighlight,
  markers: HighlightMarkers,
): readonly HighlightFragment[] => {
  const snippets = entry.snippets;
  if (Array.isArray(snippets)) {
    // An array field is reported as parallel snippets and indices, so the
    // element that matched is part of the path.
    return snippets.map((snippet, position) => {
      const index = entry.indices?.[position];
      return {
        path: typeof index === "number" ? [field, index] : [field],
        parts: splitHighlight(snippet, markers),
        truncated: "unknown",
      };
    });
  }
  if (typeof entry.value === "string") {
    // `value` is the whole field with markers, so nothing was cut from it.
    return [
      {
        path: [field],
        parts: splitHighlight(entry.value, markers),
        truncated: false,
      },
    ];
  }
  if (typeof entry.snippet === "string") {
    // `snippet` is a window around the match and Typesense never says how much
    // of the field it left out.
    return [
      {
        path: [field],
        parts: splitHighlight(entry.snippet, markers),
        truncated: "unknown",
      },
    ];
  }
  return [];
};

const toHighlights = (
  hit: TypesenseHit,
  requested: readonly string[],
  markers: HighlightMarkers,
): Readonly<Record<string, readonly HighlightFragment[]>> => {
  const highlights: Record<string, HighlightFragment[]> = {};
  for (const entry of hit.highlights ?? []) {
    const field = String(entry.field);
    if (!requested.includes(field)) {
      continue;
    }
    const fragments = toFragments(field, entry, markers);
    if (fragments.length === 0) {
      continue;
    }
    const existing = highlights[field];
    if (existing === undefined) {
      highlights[field] = [...fragments];
      continue;
    }
    existing.push(...fragments);
  }
  return highlights;
};

const toFacets = (
  response: TypesenseSearchResponse,
  types: ReadonlyMap<string, TypesenseFacetType>,
): Readonly<Record<string, SearchFacet<unknown>>> => {
  const facets: Record<string, SearchFacet<unknown>> = {};
  for (const counts of response.facet_counts ?? []) {
    const field = String(counts.field_name);
    facets[field] = {
      field,
      values: counts.counts.map((bucket) => ({
        value: parseFacetValue({
          adapter: "typesense",
          field,
          value: bucket.value,
          type: types.get(field) ?? "string",
        }),
        count: bucket.count,
      })),
      // `sampled` is Typesense admitting it counted a sample, which is the
      // exact inverse of the contract's exhaustiveness.
      exhaustive: !counts.sampled,
      native: counts,
    };
  }
  return facets;
};

const toTotal = (response: TypesenseSearchResponse): SearchTotal => ({
  value: response.found,
  accuracy: response.search_cutoff === true ? "estimated" : "exact",
  // Typesense paginates the whole match set, so every counted match is
  // reachable.
  scope: "matches",
});

const resolveNext = (
  current: number,
  size: number,
  found: number,
  approximate: boolean,
): number | null | "unknown" => {
  if (current * size < found) {
    return current + 1;
  }
  // With `search_cutoff` the count stopped early, so the page after the last
  // one it admits to cannot be ruled out.
  if (approximate) {
    return "unknown";
  }
  return null;
};

const toPage = (
  current: number,
  size: number,
  found: number,
  approximate: boolean,
): SearchPage => ({
  kind: "page",
  current,
  size,
  next: resolveNext(current, size, found, approximate),
  previous: current > 1 ? current - 1 : null,
});

const toHit = (
  hit: TypesenseHit,
  requested: readonly string[],
  markers: HighlightMarkers,
): AdapterSearchHit<TypesenseHit> => ({
  document: hit.document,
  highlights: toHighlights(hit, requested, markers),
  // The whole hit is kept, so `text_match` and anything the response carried
  // beyond this adapter's reading stay reachable.
  native: hit,
});

/**
 * Adapts an injected Typesense client and collection. Named sorts and profiles
 * must cover the index declaration.
 *
 * @example
 * ```ts
 * const adapter = typesense({
 *   client: new Typesense.Client({ nodes, apiKey }),
 *   collection: "products",
 *   profiles: { default: { queryBy: ["name", "brand"], prefix: true } },
 *   sorts: { relevance: {}, priceAsc: { sortBy: "price:asc" } },
 *   facets: { price: "number", inStock: "boolean" },
 * });
 * ```
 */
export const typesense = <
  TSortName extends string,
  TProfileName extends string,
>(
  options: TypesenseAdapterOptions<TSortName, TProfileName>,
): TypesenseSearchAdapter<TSortName, TProfileName> => {
  const facetTypes = new Map<string, TypesenseFacetType>(
    Object.entries(options.facets ?? {}),
  );

  const search = async (
    request: AdapterSearchRequest<TypesenseSearchParameters>,
    context: { signal: AbortSignal },
  ): Promise<
    AdapterSearchResponse<TypesenseHit, TypesenseSearchResponse | null>
  > => {
    const profile = resolveConfigured(options.profiles, request.profile, {
      adapter: ADAPTER_NAME,
      kind: "profiles",
    });
    const sort = resolveConfigured(options.sorts, request.sort, {
      adapter: ADAPTER_NAME,
      kind: "sorts",
    });
    const provider = request.provider;
    if (provider !== null && provider.group_by !== undefined) {
      return refuse(
        "provider.group_by",
        `Typesense answers a grouped search with grouped_hits instead of ` +
          `hits, which is a different result shape than this contract maps. ` +
          `Reach the client through the index's native handle for a grouped ` +
          `search.`,
      );
    }

    const filter = translateFilter(request.filter);
    if (filter.kind === "NONE") {
      // The filter cannot match, so the cheapest correct answer is the one that
      // never leaves the process. Nothing was asked of the engine, so there is
      // no native response to hand back.
      return emptySearchResponse(request);
    }

    // Minted per search, so a document cannot be written to contain them.
    const markers = createHighlightMarkers();
    const parameters: TypesenseSearchParameters = {
      ...(provider ?? {}),
      // Typesense spells "every document" as `*`, and an empty query only gets
      // here when the index declared that it allows one.
      q: request.query.length === 0 ? "*" : request.query,
      query_by: profile.queryBy.join(","),
      page: request.page.current,
      per_page: request.page.size,
      ...(profile.prefix === undefined ? {} : { prefix: profile.prefix }),
      ...(filter.kind === "EXPRESSION" ? { filter_by: filter.text } : {}),
      ...(sort.sortBy === undefined ? {} : { sort_by: sort.sortBy }),
      ...(request.facets.length === 0
        ? {}
        : { facet_by: request.facets.join(",") }),
      ...(request.highlights.length === 0
        ? {}
        : {
            highlight_fields: request.highlights.join(","),
            highlight_start_tag: markers.open,
            highlight_end_tag: markers.close,
          }),
    };

    const response = await options.client
      .collections(options.collection)
      .documents()
      .search(parameters, { abortSignal: context.signal });
    if (response.grouped_hits !== undefined) {
      return refuse(
        "provider.group_by",
        `Typesense answered with grouped_hits, so something in the provider ` +
          `options, a preset among them, turned grouping on. A grouped ` +
          `response is a different result shape than this contract maps.`,
      );
    }

    const approximate = response.search_cutoff === true;
    return {
      hits: (response.hits ?? []).map((hit) =>
        toHit(hit, request.highlights, markers),
      ),
      page: toPage(
        response.page,
        request.page.size,
        response.found,
        approximate,
      ),
      total: toTotal(response),
      facets: toFacets(response, facetTypes),
      took:
        typeof response.search_time_ms === "number"
          ? response.search_time_ms
          : null,
      native: response,
    };
  };

  return createSearchAdapter({
    name: ADAPTER_NAME,
    native: options.client,
    capabilities: CAPABILITIES,
    sorts: options.sorts,
    profiles: options.profiles,
    reservedOptions: RESERVED_OPTIONS,
    // The collection is what changes results without being part of the
    // request. An API key never appears here, because the fingerprint takes
    // part in cache keys and shows up in devtools.
    fingerprint: () => options.collection,
    search,
  });
};
