import { SearchProviderError } from "@priemskiyyy/scout";
import type {
  AdapterSearchHit,
  AdapterSearchResponse,
  HighlightFragment,
  SearchFacet,
  SearchFacetValue,
  SearchTotal,
  SearchTotalScope,
} from "@priemskiyyy/scout";

const ADAPTER_NAME = "http";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isScope = (value: unknown): value is SearchTotalScope =>
  value === "matches" || value === "retrievable";

const isCounted = (
  value: unknown,
): value is "exact" | "estimated" | "lower-bound" =>
  value === "exact" || value === "estimated" || value === "lower-bound";

/**
 * A body that does not describe a search is a broken backend, not a search
 * with no results, so it fails loudly instead of degrading to an empty page
 * that looks like an answer.
 */
const refuse = (detail: string): never => {
  throw new SearchProviderError({
    adapter: ADAPTER_NAME,
    message:
      `The ${ADAPTER_NAME} search answered a body the scout wire format does ` +
      `not describe: ${detail}.`,
    cause: null,
  });
};

/**
 * An absent total is a backend that said nothing about how many matched, and
 * Scout says nothing either rather than counting the page it got. A present
 * but malformed one is a mistake worth reporting.
 */
const decodeTotal = (value: unknown): SearchTotal => {
  if (typeof value === "undefined" || value === null) {
    return { accuracy: "unknown", scope: "unknown" };
  }
  if (!isRecord(value)) {
    return refuse("total is not an object");
  }
  if (isCounted(value.accuracy) && typeof value.value === "number") {
    return {
      value: value.value,
      accuracy: value.accuracy,
      scope: isScope(value.scope) ? value.scope : "matches",
    };
  }
  if (value.accuracy === "unknown") {
    return {
      accuracy: "unknown",
      scope: isScope(value.scope) ? value.scope : "unknown",
    };
  }
  return refuse(
    "total needs a numeric value with an accuracy of exact, estimated or " +
      "lower-bound, or an accuracy of unknown",
  );
};

const decodeBucket = (
  field: string,
  bucket: unknown,
): SearchFacetValue<unknown> => {
  if (!isRecord(bucket) || typeof bucket.count !== "number") {
    return refuse(`facet ${field} has a bucket without a numeric count`);
  }
  return { value: bucket.value, count: bucket.count };
};

const decodeFacets = (
  value: unknown,
): Readonly<Record<string, SearchFacet<unknown>>> => {
  if (typeof value === "undefined" || value === null) {
    return {};
  }
  if (!isRecord(value)) {
    return refuse("facets is not an object");
  }
  const facets: Record<string, SearchFacet<unknown>> = {};
  for (const [field, reported] of Object.entries(value)) {
    if (!isRecord(reported) || !Array.isArray(reported.values)) {
      return refuse(`facet ${field} has no values array`);
    }
    facets[field] = {
      field,
      values: reported.values.map((bucket) => decodeBucket(field, bucket)),
      // A backend that does not say whether it counted everything has not
      // said it did.
      exhaustive:
        typeof reported.exhaustive === "boolean"
          ? reported.exhaustive
          : "unknown",
      native: reported,
    };
  }
  return facets;
};

const isSegment = (value: unknown): value is string | number =>
  typeof value === "string" || typeof value === "number";

/**
 * Malformed highlight metadata is dropped rather than repaired. A part with no
 * text cannot be rendered, and a fabricated match is worse than no highlight.
 */
const decodeFragment = (
  field: string,
  fragment: unknown,
): readonly HighlightFragment[] => {
  if (!isRecord(fragment) || !Array.isArray(fragment.parts)) {
    return [];
  }
  const parts = fragment.parts.flatMap((part: unknown) =>
    isRecord(part) && typeof part.text === "string"
      ? [{ text: part.text, matched: part.matched === true }]
      : [],
  );
  if (parts.length === 0) {
    return [];
  }
  const path =
    Array.isArray(fragment.path) &&
    fragment.path.length > 0 &&
    fragment.path.every(isSegment)
      ? fragment.path
      : [field];
  return [
    {
      path,
      parts,
      truncated:
        typeof fragment.truncated === "boolean"
          ? fragment.truncated
          : "unknown",
    },
  ];
};

const decodeHighlights = (
  value: unknown,
): Readonly<Record<string, readonly HighlightFragment[]>> => {
  if (!isRecord(value)) {
    return {};
  }
  const highlights: Record<string, readonly HighlightFragment[]> = {};
  for (const [field, reported] of Object.entries(value)) {
    if (!Array.isArray(reported)) {
      continue;
    }
    const fragments = reported.flatMap((fragment: unknown) =>
      decodeFragment(field, fragment),
    );
    if (fragments.length > 0) {
      highlights[field] = fragments;
    }
  }
  return highlights;
};

const decodeHits = (value: unknown): readonly AdapterSearchHit<unknown>[] => {
  if (!Array.isArray(value)) {
    return refuse("hits is not an array");
  }
  return value.map((hit: unknown) => {
    if (!isRecord(hit) || !("document" in hit)) {
      return refuse("a hit has no document");
    }
    return {
      document: hit.document,
      highlights: decodeHighlights(hit.highlights),
      // Whatever else the backend put on the hit, a score included, stays
      // reachable. Scout has no normalised score of its own.
      native: hit,
    };
  });
};

/**
 * `hasMore` is the backend's own answer and wins. Failing that, a counted
 * total says whether this page was the last one. An unknown total leaves the
 * question unknown, which the contract carries rather than guessing.
 */
const nextOf = (
  hasMore: unknown,
  total: SearchTotal,
  request: {
    readonly page: { readonly current: number; readonly size: number };
  },
): number | null | "unknown" => {
  if (typeof hasMore === "boolean") {
    return hasMore ? request.page.current + 1 : null;
  }
  if (total.accuracy === "unknown") {
    return "unknown";
  }
  return request.page.current * request.page.size < total.value
    ? request.page.current + 1
    : null;
};

/**
 * The default wire response, the counterpart to `scoutWireRequest`.
 *
 * It decodes rather than trusts: the body arrives as `unknown` and every field
 * is checked, because this is the boundary where a backend's mistake becomes
 * Scout's wrong answer. `page` is derived from the request and the total, so
 * the backend never has to echo what it was asked for.
 *
 * ```json
 * {
 *   "hits": [{ "document": { "id": "1" }, "highlights": {}, "score": 1.6 }],
 *   "total": { "value": 42, "accuracy": "exact", "scope": "matches" },
 *   "facets": { "brand": { "values": [{ "value": "Apex", "count": 12 }], "exhaustive": true } },
 *   "took": 7,
 *   "hasMore": true
 * }
 * ```
 *
 * Only `hits` is required. An absent `total` reports an unknown one, an absent
 * `hasMore` derives the next page from a counted total, and an absent `took`
 * lets the core report its own measurement.
 */
export const scoutWireResponse = (
  body: unknown,
  request: {
    readonly page: { readonly current: number; readonly size: number };
  },
): AdapterSearchResponse<unknown, unknown> => {
  if (!isRecord(body)) {
    return refuse("the body is not a JSON object");
  }
  const total = decodeTotal(body.total);
  return {
    hits: decodeHits(body.hits),
    page: {
      kind: "page",
      current: request.page.current,
      size: request.page.size,
      next: nextOf(body.hasMore, total, request),
      previous: request.page.current > 1 ? request.page.current - 1 : null,
    },
    total,
    facets: decodeFacets(body.facets),
    took: typeof body.took === "number" ? body.took : null,
    native: body,
  };
};
