import type { MeilisearchIndexClient } from "src/types/MeilisearchIndexClient";
import type { MeilisearchSearchHit } from "src/types/MeilisearchSearchHit";
import type { MeilisearchSearchParams } from "src/types/MeilisearchSearchParams";
import type { MeilisearchSearchResponse } from "src/types/MeilisearchSearchResponse";

/**
 * One document in the fake's corpus. The index signature is what lets the fake
 * read a field it was handed at runtime, the way Meilisearch does.
 */
export type MeilisearchFakeProduct = {
  id: string;
  title: string;
  brand: string;
  price: number;
  tags: string[];
  [field: string]: unknown;
};

/** One recorded call, so a test can assert the request that was built. */
export type MeilisearchFakeCall = {
  query: string | null | undefined;
  params: MeilisearchSearchParams | undefined;
  signal: AbortSignal | null | undefined;
};

export type MeilisearchFake = {
  index: MeilisearchIndexClient;
  calls: MeilisearchFakeCall[];
  documents: readonly MeilisearchFakeProduct[];
};

export type MeilisearchFakeOptions = {
  uid?: string;
  documents?: readonly MeilisearchFakeProduct[];
  /** Caps the reported total the way an index's `pagination.maxTotalHits` does. */
  maxTotalHits?: number;
  /** The attributes the fake searches when a profile does not narrow them. */
  searchable?: readonly string[];
  processingTimeMs?: number;
};

const PRODUCTS: readonly MeilisearchFakeProduct[] = [
  {
    id: "1",
    title: "Trail running shoe",
    brand: "Apex",
    price: 120,
    tags: ["running", "trail"],
  },
  {
    id: "2",
    title: "Road running shoe",
    brand: "Apex",
    price: 90,
    tags: ["running", "road"],
  },
  {
    id: "3",
    title: "Climbing shoe",
    brand: "Vertex",
    price: 150,
    tags: ["climbing"],
  },
  {
    // Accents, CJK and an emoji outside the Basic Multilingual Plane, which is
    // what a byte offset based highlighter corrupts.
    id: "4",
    title: "Café Zürich 日本語 🚀 shoe",
    brand: "Vertex",
    price: 60,
    tags: ["café", "🚀 rocket"],
  },
  {
    // A document trying to forge a highlight by carrying marker shaped text.
    id: "5",
    title: "[scout:forged]injected[/scout:forged] shoe",
    brand: "Forge",
    price: 45,
    tags: ["forged"],
  },
  {
    id: "6",
    title: "Wool sock",
    brand: "Apex",
    price: 20,
    tags: ["wool"],
  },
];

const DEFAULT_SEARCHABLE = ["title", "brand"];

const textOf = (value: unknown): readonly string[] => {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => (typeof entry === "string" ? [entry] : []));
  }
  return [];
};

const matchesQuery = (
  document: MeilisearchFakeProduct,
  query: string,
  fields: readonly string[],
) => {
  if (query.length === 0) {
    return true;
  }
  const needle = query.toLowerCase();
  return fields.some((field) =>
    textOf(document[field]).some((text) => text.toLowerCase().includes(needle)),
  );
};

/**
 * Wraps every occurrence of the query in the tags the request asked for, which
 * is what Meilisearch puts in `_formatted`.
 */
const highlight = (
  value: string,
  query: string,
  open: string,
  close: string,
) => {
  if (query.length === 0) {
    return value;
  }
  // ponytail: lower casing is length preserving for everything in this corpus.
  // A few code points grow when lower cased, and a real index would need
  // locale aware folding here.
  const haystack = value.toLowerCase();
  const needle = query.toLowerCase();
  let result = "";
  let cursor = 0;
  while (cursor <= value.length) {
    const found = haystack.indexOf(needle, cursor);
    if (found === -1) {
      result += value.slice(cursor);
      break;
    }
    const end = found + needle.length;
    result += `${value.slice(cursor, found)}${open}${value.slice(found, end)}${close}`;
    cursor = end;
  }
  return result;
};

const formatValue = (
  value: unknown,
  query: string,
  open: string,
  close: string,
): unknown => {
  if (typeof value === "string") {
    return highlight(value, query, open, close);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => formatValue(entry, query, open, close));
  }
  return value;
};

const buildFormatted = (
  document: MeilisearchFakeProduct,
  query: string,
  params: MeilisearchSearchParams,
): Record<string, unknown> | undefined => {
  const fields = params.attributesToHighlight;
  if (fields === undefined || fields.length === 0) {
    return undefined;
  }
  const open = params.highlightPreTag ?? "<em>";
  const close = params.highlightPostTag ?? "</em>";
  // Meilisearch formats every displayed attribute and highlights the requested
  // ones. The fake only formats the requested ones, which is all an adapter
  // that keys highlights by requested field ever reads.
  return Object.fromEntries(
    fields.map((field) => [
      field,
      formatValue(document[field], query, open, close),
    ]),
  );
};

const countValues = (
  documents: readonly MeilisearchFakeProduct[],
  field: string,
) => {
  const counts: Record<string, number> = {};
  for (const document of documents) {
    const value = document[field];
    const entries = Array.isArray(value) ? value : [value];
    for (const entry of entries) {
      if (entry === null || entry === undefined) {
        continue;
      }
      const key = `${entry}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
};

const numbersOf = (
  documents: readonly MeilisearchFakeProduct[],
  field: string,
) =>
  documents.flatMap((document) => {
    const value = document[field];
    return typeof value === "number" ? [value] : [];
  });

const statsFor = (
  documents: readonly MeilisearchFakeProduct[],
  field: string,
): readonly (readonly [string, { min: number; max: number }])[] => {
  const numbers = numbersOf(documents, field);
  if (numbers.length === 0) {
    return [];
  }
  return [[field, { min: Math.min(...numbers), max: Math.max(...numbers) }]];
};

const buildFacets = (
  documents: readonly MeilisearchFakeProduct[],
  fields: readonly string[] | undefined,
) => {
  if (fields === undefined || fields.length === 0) {
    return {};
  }
  const stats = fields.flatMap((field) => statsFor(documents, field));
  return {
    facetDistribution: Object.fromEntries(
      fields.map((field) => [field, countValues(documents, field)]),
    ),
    ...(stats.length === 0 ? {} : { facetStats: Object.fromEntries(stats) }),
  };
};

const paginate = (
  matched: readonly MeilisearchFakeProduct[],
  params: MeilisearchSearchParams,
  maxTotalHits: number,
) => {
  const reachable = Math.min(matched.length, maxTotalHits);
  if (params.page !== undefined || params.hitsPerPage !== undefined) {
    const page = params.page ?? 1;
    const hitsPerPage = params.hitsPerPage ?? 20;
    const start = (page - 1) * hitsPerPage;
    return {
      documents: matched.slice(start, Math.min(start + hitsPerPage, reachable)),
      pagination: {
        totalHits: reachable,
        totalPages: Math.ceil(reachable / hitsPerPage),
        page,
        hitsPerPage,
      },
    };
  }
  const offset = params.offset ?? 0;
  const limit = params.limit ?? 20;
  return {
    documents: matched.slice(offset, Math.min(offset + limit, reachable)),
    pagination: { offset, limit, estimatedTotalHits: reachable },
  };
};

/**
 * An in-process stand in for a Meilisearch index client. It answers with the
 * response shape the SDK produces and records every call, so a test can assert
 * the request the adapter built.
 *
 * It does not evaluate `filter`: the filter string is asserted on the recorded
 * call, which is where a translation bug actually shows up, and a fake that
 * reimplemented the Meilisearch filter grammar would only prove the fake.
 *
 * @example
 * ```ts
 * const fake = createMeilisearchFake();
 * const adapter = meilisearch({ index: fake.index, profiles: {}, sorts: {} });
 * expect(fake.calls[0]?.params?.filter).toBe('brand = "Apex"');
 * ```
 */
export const createMeilisearchFake = (
  options: MeilisearchFakeOptions = {},
): MeilisearchFake => {
  const documents = options.documents ?? PRODUCTS;
  const searchable = options.searchable ?? DEFAULT_SEARCHABLE;
  const maxTotalHits = options.maxTotalHits ?? 1000;
  const processingTimeMs = options.processingTimeMs ?? 7;
  const calls: MeilisearchFakeCall[] = [];

  const index: MeilisearchIndexClient = {
    uid: options.uid ?? "products",
    search: async (query, params, extraRequestInit) => {
      const signal = extraRequestInit?.signal ?? null;
      calls.push({ query, params, signal });
      if (signal?.aborted === true) {
        throw new Error("The fake meilisearch request was aborted.");
      }
      const request: MeilisearchSearchParams = params ?? {};
      const text = typeof query === "string" ? query : "";
      const fields = request.attributesToSearchOn ?? searchable;
      const matched = documents.filter((document) =>
        matchesQuery(document, text, fields),
      );
      const page = paginate(matched, request, maxTotalHits);
      const hits: MeilisearchSearchHit[] = page.documents.map((document) => {
        const formatted = buildFormatted(document, text, request);
        return {
          ...document,
          ...(formatted === undefined ? {} : { _formatted: formatted }),
        };
      });
      const response: MeilisearchSearchResponse = {
        hits,
        processingTimeMs,
        query: text,
        ...page.pagination,
        ...buildFacets(matched, request.facets),
      };
      return response;
    },
  };

  return { index, calls, documents };
};
