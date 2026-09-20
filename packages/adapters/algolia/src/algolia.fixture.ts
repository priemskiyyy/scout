import type { AlgoliaExhaustive } from "src/types/AlgoliaExhaustive";
import type { AlgoliaHit } from "src/types/AlgoliaHit";
import type { AlgoliaSearchClient } from "src/types/AlgoliaSearchClient";
import type { AlgoliaSearchParams } from "src/types/AlgoliaSearchParams";
import type { AlgoliaSearchResponse } from "src/types/AlgoliaSearchResponse";

/** One search the fake was asked for, with the parameters it received. */
export type AlgoliaFakeCall = {
  method: "searchSingleIndex" | "searchSingleIndexWithHTTPInfo";
  indexName: string;
  searchParams: AlgoliaSearchParams;
};

export type AlgoliaFakeDocument = Readonly<Record<string, unknown>> & {
  objectID: string;
  title: string;
  brand: string;
  price: number;
  tags: readonly string[];
};

export type AlgoliaFakeOptions = {
  documents?: readonly AlgoliaFakeDocument[];
  /**
   * What the fake claims about its own counting. `null` reports nothing at all,
   * which is how a response with `responseFields` trimmed arrives.
   */
  exhaustive?: AlgoliaExhaustive | null;
  /** Replaces the counts the corpus would produce, to reach a deep index. */
  pagination?: { nbHits?: number; nbPages?: number };
  /**
   * Opens a highlight and never closes it, which is the malformed metadata an
   * adapter has to degrade to plain text rather than guess at.
   */
  brokenHighlights?: boolean;
  /** Rejects every search with this reason. */
  fail?: unknown;
};

/**
 * A tiny product corpus. The two running products are what the conformance
 * fixtures query for, and neither of them holds markup, so the hostile document
 * cannot leak into the conformance suite's highlight assertions.
 */
export const ALGOLIA_FAKE_PRODUCTS: readonly AlgoliaFakeDocument[] = [
  {
    objectID: "1",
    title: "Acme running shoe",
    brand: "acme",
    price: 79,
    tags: ["running", "sale"],
  },
  {
    objectID: "2",
    title: "Bolt running jacket",
    brand: "bolt",
    price: 129,
    tags: ["running"],
  },
  {
    objectID: "3",
    title: "Acme trail sandal",
    brand: "acme",
    price: 45,
    tags: ["trail"],
  },
  {
    objectID: "4",
    title: 'Mug with a "quoted" handle',
    brand: "mug co",
    price: 12,
    tags: ["kitchen"],
  },
  {
    // Indexed markup. Algolia would return it inside `_highlightResult.value`
    // untouched, so it is the document that tries to forge a highlight.
    objectID: "5",
    title: "Lamp with <em>markup</em> inside",
    brand: "forge",
    price: 20,
    tags: ["home"],
  },
];

const SEARCHABLE: readonly string[] = ["title", "brand"];

const matches = (document: AlgoliaFakeDocument, query: string): boolean => {
  if (query.length === 0) {
    return true;
  }
  const needle = query.toLowerCase();
  return SEARCHABLE.some((field) => {
    const value = document[field];
    if (typeof value !== "string") {
      return false;
    }
    return value.toLowerCase().includes(needle);
  });
};

/**
 * Wraps every occurrence of the query in the tags the caller asked for, the way
 * Algolia does. Scanned rather than replaced with a regular expression, because
 * a query is user text and would otherwise be read as a pattern.
 */
const mark = (
  value: string,
  query: string,
  params: AlgoliaSearchParams,
  broken: boolean,
): string => {
  const pre =
    typeof params.highlightPreTag === "string"
      ? params.highlightPreTag
      : "<em>";
  let post = "";
  if (!broken) {
    post =
      typeof params.highlightPostTag === "string"
        ? params.highlightPostTag
        : "</em>";
  }
  if (query.length === 0) {
    return value;
  }
  const needle = query.toLowerCase();
  const haystack = value.toLowerCase();
  let marked = "";
  let cursor = 0;

  while (cursor < value.length) {
    const found = haystack.indexOf(needle, cursor);
    if (found === -1) {
      break;
    }
    marked += value.slice(cursor, found);
    marked += `${pre}${value.slice(found, found + query.length)}${post}`;
    cursor = found + query.length;
  }
  return marked + value.slice(cursor);
};

const highlightValue = (
  value: unknown,
  query: string,
  params: AlgoliaSearchParams,
  broken: boolean,
): unknown => {
  if (Array.isArray(value)) {
    return value.map((element) =>
      highlightValue(element, query, params, broken),
    );
  }
  if (typeof value !== "string") {
    return undefined;
  }
  return {
    value: mark(value, query, params, broken),
    matchLevel: value.toLowerCase().includes(query.toLowerCase())
      ? "full"
      : "none",
    matchedWords: [],
  };
};

const buildHighlightResult = (
  document: AlgoliaFakeDocument,
  query: string,
  params: AlgoliaSearchParams,
  broken: boolean,
): Readonly<Record<string, unknown>> | undefined => {
  const fields = params.attributesToHighlight;
  if (!Array.isArray(fields) || fields.length === 0) {
    return undefined;
  }
  return Object.fromEntries(
    fields
      .map((field) => [
        field,
        highlightValue(document[field], query, params, broken),
      ])
      .filter(([, value]) => typeof value !== "undefined"),
  );
};

const countFacets = (
  documents: readonly AlgoliaFakeDocument[],
  fields: readonly string[],
): Readonly<Record<string, Readonly<Record<string, number>>>> =>
  Object.fromEntries(
    fields.map((field) => {
      const counts: Record<string, number> = {};
      for (const document of documents) {
        const value = document[field];
        const values = Array.isArray(value) ? value : [value];
        for (const each of values) {
          if (
            typeof each !== "string" &&
            typeof each !== "number" &&
            typeof each !== "boolean"
          ) {
            continue;
          }
          const key = String(each);
          counts[key] = (counts[key] ?? 0) + 1;
        }
      }
      return [field, counts];
    }),
  );

/**
 * An in-process stand in for the Algolia search client. It answers from a
 * corpus and records every call, which is what the adapter's own tests assert
 * against.
 *
 * It deliberately does not interpret `filters`. Only Algolia knows what that
 * string means, so the tests assert the exact string the adapter sends rather
 * than trusting a second implementation of the grammar to agree with the first.
 *
 * @example
 * ```ts
 * const fake = createAlgoliaFake();
 * const adapter = algolia({ client: fake.client, index: { name: "products" }, ... });
 * await adapter.search(request, { signal });
 * expect(fake.calls[0]?.searchParams.page).toBe(0);
 * ```
 */
export const createAlgoliaFake = (options: AlgoliaFakeOptions = {}) => {
  const documents = options.documents ?? ALGOLIA_FAKE_PRODUCTS;
  const calls: AlgoliaFakeCall[] = [];

  const answer = (
    method: AlgoliaFakeCall["method"],
    indexName: string,
    searchParams: AlgoliaSearchParams | undefined,
  ): Promise<AlgoliaSearchResponse> => {
    const params = searchParams ?? {};
    calls.push({ method, indexName, searchParams: params });

    if (typeof options.fail !== "undefined") {
      return Promise.reject(options.fail);
    }

    const query = typeof params.query === "string" ? params.query : "";
    const size =
      typeof params.hitsPerPage === "number" ? params.hitsPerPage : 20;
    const page = typeof params.page === "number" ? params.page : 0;
    const matched = documents.filter((document) => matches(document, query));
    const nbHits = options.pagination?.nbHits ?? matched.length;
    const nbPages =
      options.pagination?.nbPages ?? Math.max(1, Math.ceil(nbHits / size));

    const hits: AlgoliaHit[] = matched
      .slice(page * size, page * size + size)
      .map((document) => {
        const highlight = buildHighlightResult(
          document,
          query,
          params,
          options.brokenHighlights === true,
        );
        if (typeof highlight === "undefined") {
          return { ...document };
        }
        return { ...document, _highlightResult: highlight };
      });

    return Promise.resolve({
      hits,
      nbHits,
      page,
      nbPages,
      hitsPerPage: size,
      ...(options.exhaustive === null
        ? {}
        : {
            exhaustive: options.exhaustive ?? {
              nbHits: true,
              facetValues: true,
            },
          }),
      facets: countFacets(
        matched,
        Array.isArray(params.facets) ? params.facets : [],
      ),
      processingTimeMS: 3,
      queryID: "fake-query-id",
    });
  };

  const client: AlgoliaSearchClient = {
    searchSingleIndex: (props) =>
      answer("searchSingleIndex", props.indexName, props.searchParams),
    searchSingleIndexWithHTTPInfo: async (props) => ({
      data: await answer(
        "searchSingleIndexWithHTTPInfo",
        props.indexName,
        props.searchParams,
      ),
    }),
  };

  return { client, calls, documents };
};
