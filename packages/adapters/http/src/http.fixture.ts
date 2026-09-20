import type { FilterExpression } from "@priemskiyyy/scout";
import { assertUnreachable } from "@priemskiyyy/scout";
import type { HttpFetch } from "src/types/HttpFetch";
import type { HttpFetchInit } from "src/types/HttpFetchInit";
import type { HttpFetchResponse } from "src/types/HttpFetchResponse";

/**
 * A backend in memory. It speaks the scout wire format and really evaluates
 * what it is sent: the query, every filter operator, facet counts over the
 * matched set and highlights that rejoin to the original text. That is what
 * lets the conformance suite assert which documents came back rather than only
 * that a request was well formed.
 */
export type FixtureProduct = {
  id: string;
  title: string;
  brand: string;
  category: string;
  price: number;
};

export const PRODUCTS: readonly FixtureProduct[] = [
  {
    id: "1",
    title: "Trail running shoe",
    brand: "Apex",
    category: "footwear",
    price: 120,
  },
  {
    id: "2",
    title: "Court shoe",
    brand: "Apex",
    category: "footwear",
    price: 90,
  },
  {
    id: "3",
    title: "Merino sock",
    brand: "Nomad",
    category: "accessories",
    price: 18,
  },
  {
    id: "4",
    title: "Hiking shoe",
    brand: "Nomad",
    category: "footwear",
    price: 240,
  },
  {
    id: "5",
    title: "Rain jacket",
    brand: "Apex",
    category: "outerwear",
    price: 310,
  },
];

/** What the fake reads out of a request, whichever way it arrived. */
type BackendRequest = {
  query: string;
  filter: FilterExpression;
  facets: readonly string[];
  highlights: readonly string[];
  readonly page: { readonly current: number; readonly size: number };
};

export type FixtureCall = { url: string; init: HttpFetchInit };

export type FixtureBackend = {
  fetch: HttpFetch;
  /** Every call the adapter made, in order, with the init it passed. */
  calls: readonly FixtureCall[];
};

export type FixtureBackendOptions = {
  /** Answers with this status instead of searching. */
  status?: number;
  /** Answers with this exact text, for a body the format does not describe. */
  body?: string;
  /** Never answers until the signal aborts, for the cancellation tests. */
  pending?: boolean;
  /** Reported as `took`. */
  took?: number;
};

const valueOf = (document: FixtureProduct, field: string): unknown => {
  const record: Readonly<Record<string, unknown>> = document;
  return record[field];
};

const compare = (left: unknown, right: unknown): number | null => {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  if (typeof left === "string" && typeof right === "string") {
    if (left < right) {
      return -1;
    }
    if (left > right) {
      return 1;
    }
    return 0;
  }
  return null;
};

const matchesComparison = (
  document: FixtureProduct,
  node: Extract<FilterExpression, { type: "comparison" }>,
): boolean => {
  const actual = valueOf(document, node.field);
  const values = Array.isArray(node.value) ? node.value : [];
  if (node.operator === "eq") {
    return actual === node.value;
  }
  if (node.operator === "neq") {
    return actual !== node.value;
  }
  if (node.operator === "in") {
    return values.includes(actual);
  }
  if (node.operator === "not-in") {
    return !values.includes(actual);
  }
  if (node.operator === "between") {
    const [min, max] = values;
    const low = compare(actual, min);
    const high = compare(actual, max);
    return low !== null && low >= 0 && high !== null && high <= 0;
  }
  const order = compare(actual, node.value);
  if (order === null) {
    return false;
  }
  if (node.operator === "gt") {
    return order > 0;
  }
  if (node.operator === "gte") {
    return order >= 0;
  }
  if (node.operator === "lt") {
    return order < 0;
  }
  if (node.operator === "lte") {
    return order <= 0;
  }
  return assertUnreachable(node.operator);
};

const matches = (
  filter: FilterExpression,
  document: FixtureProduct,
): boolean => {
  if (filter.type === "constant") {
    return filter.value;
  }
  if (filter.type === "comparison") {
    return matchesComparison(document, filter);
  }
  if (filter.type === "not") {
    return !matches(filter.expression, document);
  }
  if (filter.type === "and") {
    return filter.expressions.every((child) => matches(child, document));
  }
  if (filter.type === "or") {
    return filter.expressions.some((child) => matches(child, document));
  }
  return assertUnreachable(filter);
};

/** Keeps every character, so the parts rejoin to exactly the field. */
const partsOf = (
  text: string,
  term: string,
): readonly { text: string; matched: boolean }[] => {
  if (term === "") {
    return [{ text, matched: false }];
  }
  const parts: { text: string; matched: boolean }[] = [];
  const haystack = text.toLowerCase();
  let cursor = 0;
  let found = haystack.indexOf(term, cursor);
  while (found !== -1) {
    if (found > cursor) {
      parts.push({ text: text.slice(cursor, found), matched: false });
    }
    parts.push({ text: text.slice(found, found + term.length), matched: true });
    cursor = found + term.length;
    found = haystack.indexOf(term, cursor);
  }
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), matched: false });
  }
  return parts;
};

const highlightsFor = (
  document: FixtureProduct,
  fields: readonly string[],
  query: string,
) => {
  const highlights: Record<string, unknown[]> = {};
  for (const field of fields) {
    const text = valueOf(document, field);
    if (typeof text !== "string") {
      continue;
    }
    highlights[field] = [
      {
        path: [field],
        parts: partsOf(text, query.trim().toLowerCase()),
        truncated: false,
      },
    ];
  }
  return highlights;
};

const facetsFor = (
  documents: readonly FixtureProduct[],
  fields: readonly string[],
) => {
  const facets: Record<string, unknown> = {};
  for (const field of fields) {
    const counts = new Map<unknown, number>();
    for (const document of documents) {
      const value = valueOf(document, field);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    facets[field] = {
      values: [...counts].map(([value, count]) => ({ value, count })),
      exhaustive: true,
    };
  }
  return facets;
};

const parseParam = (value: string | null) => {
  if (value === null) {
    return undefined;
  }
  return JSON.parse(value);
};

/**
 * A GET carries the same request in the query string: a string travels as
 * itself and everything else as JSON, which is what the adapter documents.
 */
const fromQuery = (url: string) => {
  const params = new URL(url, "http://fixture.test").searchParams;
  return {
    query: params.get("query"),
    filter: parseParam(params.get("filter")),
    facets: parseParam(params.get("facets")),
    highlights: parseParam(params.get("highlights")),
    page: parseParam(params.get("page")),
  };
};

const readRequest = (url: string, init: HttpFetchInit): BackendRequest => {
  const sent =
    typeof init.body === "string" ? JSON.parse(init.body) : fromQuery(url);
  // A custom mapping sends whatever its own backend expects, so the fake fills
  // in what a search means without the fields that mapping did not send.
  return {
    query: typeof sent.query === "string" ? sent.query : "",
    filter: sent.filter ?? { type: "constant", value: true },
    facets: sent.facets ?? [],
    highlights: sent.highlights ?? [],
    page: sent.page ?? { current: 1, size: 10 },
  };
};

const runSearch = (request: BackendRequest, took: number | undefined) => {
  const term = request.query.trim().toLowerCase();
  const matched = PRODUCTS.filter(
    (product) =>
      product.title.toLowerCase().includes(term) &&
      matches(request.filter, product),
  );
  const from = (request.page.current - 1) * request.page.size;
  return {
    hits: matched.slice(from, from + request.page.size).map((document) => ({
      document,
      highlights: highlightsFor(document, request.highlights, request.query),
      // A backend is free to add its own keys; they arrive on `hit.native`.
      score: 1 / (PRODUCTS.indexOf(document) + 1),
    })),
    total: { value: matched.length, accuracy: "exact", scope: "matches" },
    facets: facetsFor(matched, request.facets),
    took: took ?? null,
  };
};

const respond = (status: number, text: string): HttpFetchResponse => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => text,
});

/**
 * A fake fetch over `PRODUCTS`, in the shape the adapter calls.
 *
 * @example
 * ```ts
 * const backend = createSearchBackend();
 * const adapter = http({ endpoint: "https://api.test/search", fetch: backend.fetch, ... });
 * ```
 */
export const createSearchBackend = (
  options: FixtureBackendOptions = {},
): FixtureBackend => {
  const calls: FixtureCall[] = [];

  const fetch: HttpFetch = async (url, init) => {
    calls.push({ url, init });
    if (options.pending === true) {
      // Fetch rejects when the connection is aborted, and holding the promise
      // open until then is what lets a test prove the signal really arrived
      // rather than the caller having walked away from it.
      return await new Promise<HttpFetchResponse>((_, reject) => {
        init.signal.addEventListener("abort", () => {
          reject(new Error("The fixture backend request was aborted."));
        });
      });
    }
    const status = options.status ?? 200;
    if (typeof options.body === "string") {
      return respond(status, options.body);
    }
    if (status >= 300) {
      return respond(status, `{"error":"the fixture refused with ${status}"}`);
    }
    return respond(
      status,
      JSON.stringify(runSearch(readRequest(url, init), options.took)),
    );
  };

  return { fetch, calls };
};
