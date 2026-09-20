import {
  SearchConfigurationError,
  createSearchAdapter,
  emptySearchResponse,
  matchesFilter,
  resolveConfigured,
} from "@priemskiyyy/scout";

import type { MiniSearchProfile } from "src/types/MiniSearchProfile";
import type { MiniSearchResult } from "src/types/MiniSearchResult";
import type { MiniSearchSearchOptions } from "src/types/MiniSearchSearchOptions";
import type { MiniSearchSort } from "src/types/MiniSearchSort";
import type { MiniSearchOptions } from "src/types/MiniSearchOptions";
import type { MiniSearchAdapter } from "src/types/MiniSearchAdapter";
import type {
  AdapterSearchRequest,
  AdapterSearchResponse,
  FilterExpression,
  HighlightFragment,
  SearchCapabilities,
  SearchFacet,
} from "@priemskiyyy/scout";

const ADAPTER_NAME = "minisearch";

/** The keys MiniSearch puts on a result itself, around the stored fields. */
const RESULT_METADATA = ["id", "score", "terms", "queryTerms", "match"];

const NO_HIGHLIGHTS: Readonly<Record<string, readonly HighlightFragment[]>> =
  Object.freeze({});

const NO_FACETS: Readonly<Record<string, SearchFacet<unknown>>> = Object.freeze(
  {},
);

const CAPABILITIES: SearchCapabilities = {
  // MiniSearch applies filters before pagination, so totals remain exact.
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
  // MiniSearch has no facet index or match offsets.
  facets: { resultScoped: false },
  highlights: "none",
  // MiniSearch runs to completion in process. Aborting stops Scout waiting for
  // the answer; it does not stop the work.
  cancellation: "logical",
};

const storedFieldsOf = (
  result: MiniSearchResult,
): Readonly<Record<string, unknown>> => {
  const stored: Record<string, unknown> = {};
  for (const key of Object.keys(result)) {
    if (RESULT_METADATA.includes(key)) {
      continue;
    }
    stored[key] = result[key];
  }
  return stored;
};

/**
 * Adapts an injected MiniSearch instance. Filters and pagination use the
 * complete match set, keeping totals exact. Sorting is relevance-only;
 * facets and highlights are unsupported.
 *
 * @example
 * ```ts
 * const products = new MiniSearch<Product>({
 *   fields: ["title", "category"],
 *   storeFields: ["id", "title", "category", "price"],
 * });
 * products.addAll(catalogue);
 *
 * const adapter = minisearch({
 *   index: products,
 *   revision: () => catalogueVersion,
 *   profiles: { default: { fields: ["title", "category"], prefix: true } },
 *   sorts: { relevance: "relevance" },
 * });
 * ```
 */
export const minisearch = <TProfile extends string, TSort extends string>(
  options: MiniSearchOptions<TProfile, TSort>,
): MiniSearchAdapter<TProfile, TSort> => {
  // The declared names are what an index checks its coverage against. Looking
  // one up by a name that came in on a request is a different question, so the
  // records are read here through their widened shape.
  const profiles: Readonly<Record<string, MiniSearchProfile>> =
    options.profiles;
  const sorts: Readonly<Record<string, MiniSearchSort>> = options.sorts;

  const documentOf = (result: MiniSearchResult): unknown => {
    const stored = storedFieldsOf(result);
    if (typeof options.resolve === "function") {
      return options.resolve(result.id, stored);
    }
    if (Object.keys(stored).length === 0) {
      // Without a resolver the stored fields are the document, so an instance
      // that stores nothing cannot produce one. Saying that here keeps it from
      // arriving as a schema failure listing every missing field.
      throw new SearchConfigurationError({
        path: "resolve",
        message:
          `The ${ADAPTER_NAME} adapter got no stored fields for document ` +
          `${String(result.id)}. A MiniSearch result carries only the fields ` +
          `in storeFields, so either list every schema field there or pass ` +
          `resolve to build the document yourself.`,
      });
    }
    return { id: result.id, ...stored };
  };

  const predicateFor = (
    expression: FilterExpression,
  ): ((result: MiniSearchResult) => boolean) | null => {
    if (expression.type === "constant" && expression.value) {
      return null;
    }
    // The predicate reads the same document the hit will carry, so a filter
    // sees exactly what the application sees. A field that is neither stored
    // nor resolved is absent for both.
    return (result) => matchesFilter(expression, documentOf(result));
  };

  return createSearchAdapter({
    name: ADAPTER_NAME,
    native: options.index,
    capabilities: CAPABILITIES,
    sorts: options.sorts,
    profiles: options.profiles,
    // Scout owns filtering through its AST, so a native `filter` would apply a
    // second predicate the query identity cannot see.
    reservedOptions: ["filter"],
    // A local corpus is part of what the answer depends on, and it is not part
    // of the request, so the revision belongs here. It is the caller's value,
    // never a credential.
    fingerprint: () => `${ADAPTER_NAME}:${String(options.revision())}`,
    search: async (
      request: AdapterSearchRequest<MiniSearchProfile>,
    ): Promise<
      AdapterSearchResponse<
        MiniSearchResult,
        readonly MiniSearchResult[] | null
      >
    > => {
      // Every declared sort is an alias for relevance, so the only question a
      // sort name asks here is whether this adapter was configured with it.
      resolveConfigured(sorts, request.sort, {
        adapter: ADAPTER_NAME,
        kind: "sorts",
      });
      const profile = resolveConfigured(profiles, request.profile, {
        adapter: ADAPTER_NAME,
        kind: "profiles",
      });
      if (request.filter.type === "constant" && !request.filter.value) {
        // A contradiction matches nothing, and the engine does not need to be
        // asked to confirm it. It was never asked, so there is no result array
        // to hand back as its own.
        return emptySearchResponse(request);
      }

      const searchOptions: MiniSearchSearchOptions = {
        ...profile,
        ...(request.provider === null ? {} : request.provider),
      };
      const predicate = predicateFor(request.filter);
      if (predicate !== null) {
        searchOptions.filter = predicate;
      }

      const results = options.index.search(request.query, searchOptions);
      // Scout pages are one based, and MiniSearch answered with every match,
      // so the page is a slice and the total is the length of what it sliced.
      const start = (request.page.current - 1) * request.page.size;
      const end = request.page.current * request.page.size;

      return {
        hits: results.slice(start, end).map((result) => ({
          document: documentOf(result),
          highlights: NO_HIGHLIGHTS,
          native: result,
        })),
        page: {
          kind: "page",
          current: request.page.current,
          size: request.page.size,
          next: end < results.length ? request.page.current + 1 : null,
          previous: request.page.current > 1 ? request.page.current - 1 : null,
        },
        total: { value: results.length, accuracy: "exact", scope: "matches" },
        facets: NO_FACETS,
        // MiniSearch reports no timing of its own, and the core measures the
        // call itself rather than being handed a number this adapter invented.
        took: null,
        native: results,
      };
    },
  });
};
