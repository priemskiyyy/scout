import { whereFor } from "src/utils/whereFor";
import { declaredKind } from "src/utils/internal/declaredKind";
import { refuse } from "src/utils/internal/refuse";
import { ADAPTER_NAME } from "src/utils/constants/adapterName";
import type { OramaFacetResult } from "src/types/OramaFacetResult";
import type { OramaHit } from "src/types/OramaHit";
import type { OramaResponse } from "src/types/OramaResponse";

import type { OramaFacetDefinition } from "src/types/OramaFacetDefinition";
import type { OramaSearchParams } from "src/types/OramaSearchParams";
import type { OramaDatabase } from "src/types/OramaDatabase";
import type { OramaSearchProfile } from "src/types/OramaSearchProfile";
import type { OramaSearchSort } from "src/types/OramaSearchSort";
import type { OramaSearchAdapterOptions } from "src/types/OramaSearchAdapterOptions";
import type {
  AdapterSearchRequest,
  AdapterSearchResponse,
  HighlightFragment,
  SearchAdapter,
  SearchCapabilities,
  SearchFacet,
} from "@priemskiyyy/scout";
import {
  createSearchAdapter,
  emptySearchResponse,
  resolveConfigured,
} from "@priemskiyyy/scout";

const NANOSECONDS_PER_MILLISECOND = 1_000_000;

/** Highlights are not reported, so every hit carries the same empty record. */
const NO_HIGHLIGHTS: Readonly<Record<string, readonly HighlightFragment[]>> =
  Object.freeze({});

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
  // Orama takes a limit and an offset and reports an exact count, so every page
  // is reachable and its size is the application's choice.
  pagination: { maxPageSize: null },
  facets: { resultScoped: true },
  // Orama's keyword search reports no match offsets, and deriving them from a
  // tokenizer this package cannot see would be fabricating them.
  highlights: "none",
  // Orama runs to completion in process. Aborting stops Scout waiting and does
  // not stop the work.
  cancellation: "logical",
};

const facetDefinitions = (
  schema: Readonly<Record<string, unknown>>,
  fields: readonly string[],
): Readonly<Record<string, OramaFacetDefinition>> | undefined => {
  if (fields.length === 0) {
    return undefined;
  }
  const definitions: Record<string, OramaFacetDefinition> = {};
  for (const field of fields) {
    const kind = declaredKind(schema, field);
    if (kind === "number" || kind === "number[]") {
      refuse(
        `facets.${field}`,
        `The ${ADAPTER_NAME} adapter cannot facet ${field}, because Orama ` +
          `counts a number property into ranges that the portable facet ` +
          `request does not carry.`,
      );
    }
    definitions[field] = {};
  }
  return definitions;
};

const facetValue = (
  kind: string | null,
  reported: string,
): string | boolean => {
  // Orama keys every bucket by the stringified value, so a boolean property
  // comes back as "true" and "false".
  if (kind === "boolean" || kind === "boolean[]") {
    return reported === "true";
  }
  return reported;
};

const facetsFor = (
  schema: Readonly<Record<string, unknown>>,
  fields: readonly string[],
  reported: Readonly<Record<string, OramaFacetResult>> | undefined,
): Readonly<Record<string, SearchFacet<unknown>>> => {
  const facets: Record<string, SearchFacet<unknown>> = {};
  if (reported === undefined) {
    return facets;
  }
  for (const field of fields) {
    const result = reported[field];
    if (result === undefined) {
      continue;
    }
    const kind = declaredKind(schema, field);
    const buckets = Object.entries(result.values);
    facets[field] = {
      field,
      values: buckets.map(([value, count]) => ({
        value: facetValue(kind, value),
        count,
      })),
      // Orama counts every distinct value and then returns at most its own
      // limit of them, so a shorter list than the count is a truncated one.
      exhaustive: buckets.length === result.count,
      native: result,
    };
  }
  return facets;
};

/**
 * Adapts an injected Orama database for portable keyword search. Update
 * `revision` when the corpus changes so subsequent queries get new cache keys.
 *
 * @example
 * ```ts
 * import { create, insert, search } from "@orama/orama";
 *
 * const db = create({ schema: { name: "string", brand: "enum" } });
 * let revision = 0;
 *
 * const adapter = orama({
 *   db,
 *   search,
 *   revision: () => revision,
 *   profiles: { default: {}, names: { properties: ["name"] } },
 *   sorts: { relevance: {}, priceAsc: { sortBy: { property: "price" } } },
 * });
 *
 * insert(db, { name: "Wireless Headphones", brand: "Acme Audio" });
 * revision += 1;
 * ```
 */
export const orama = <
  TDatabase extends OramaDatabase,
  TDocument,
  TSorts extends Readonly<Record<string, OramaSearchSort>>,
  TProfiles extends Readonly<Record<string, OramaSearchProfile>>,
>(
  options: OramaSearchAdapterOptions<TDatabase, TDocument, TSorts, TProfiles>,
): SearchAdapter<
  TDatabase,
  never,
  OramaHit<TDocument>,
  OramaResponse<TDocument> | null
> & { sorts: TSorts; profiles: TProfiles } => {
  return createSearchAdapter({
    name: ADAPTER_NAME,
    native: options.db,
    capabilities: CAPABILITIES,
    sorts: options.sorts,
    profiles: options.profiles,
    // Nothing is merged into the Orama request, so no provider option can
    // collide with a field Scout owns.
    reservedOptions: [],
    fingerprint: () => `${ADAPTER_NAME}:${options.revision()}`,
    search: async (
      request: AdapterSearchRequest<never>,
    ): Promise<
      AdapterSearchResponse<
        OramaHit<TDocument>,
        OramaResponse<TDocument> | null
      >
    > => {
      const profile = resolveConfigured(options.profiles, request.profile, {
        adapter: ADAPTER_NAME,
        kind: "profiles",
      });
      const sort = resolveConfigured(options.sorts, request.sort, {
        adapter: ADAPTER_NAME,
        kind: "sorts",
      });

      if (request.filter.type === "constant" && !request.filter.value) {
        // Orama would answer this with a full scan against an empty
        // intersection, which costs the whole corpus to be told what the
        // filter already said. Nothing was searched, so there is no native
        // response to hand back.
        return emptySearchResponse(request);
      }

      const schema = options.db.schema;
      const matchesEverything =
        request.filter.type === "constant" && request.filter.value === true;

      const params: OramaSearchParams = {
        term: request.query,
        limit: request.page.size,
        offset: (request.page.current - 1) * request.page.size,
        properties: profile.properties,
        boost: profile.boost,
        tolerance: profile.tolerance,
        threshold: profile.threshold,
        sortBy: sort.sortBy,
        where: matchesEverything ? undefined : whereFor(schema, request.filter),
        facets: facetDefinitions(schema, request.facets),
      };

      // Orama answers a plain database synchronously and a database with async
      // components with a promise. Scout promises a promise either way.
      const response = await options.search(options.db, params);
      const elapsed = response.elapsed;

      return {
        hits: response.hits.map((hit) => ({
          document: hit.document,
          highlights: NO_HIGHLIGHTS,
          native: hit,
        })),
        page: {
          kind: "page",
          current: request.page.current,
          size: request.page.size,
          // The count is exact, so whether another page exists is known rather
          // than guessed.
          next:
            request.page.current * request.page.size < response.count
              ? request.page.current + 1
              : null,
          previous: request.page.current > 1 ? request.page.current - 1 : null,
        },
        total: { value: response.count, accuracy: "exact", scope: "matches" },
        facets: facetsFor(schema, request.facets, response.facets),
        // Null when Orama reported nothing, so the core measures the call and
        // labels it as its own. Returning a measurement here would have been
        // reported to the application as the engine's own time.
        took:
          elapsed === undefined
            ? null
            : elapsed.raw / NANOSECONDS_PER_MILLISECOND,
        native: response,
      };
    },
  });
};
