import type { FilterValue, SortDirection } from "@priemskiyyy/scout";

import type { ElasticBoolQuery } from "src/types/ElasticBoolQuery";
import type { ElasticQuery } from "src/types/ElasticQuery";
import type { ElasticRange } from "src/types/ElasticRange";
import type { ElasticSearchBody } from "src/types/ElasticSearchBody";
import type { ElasticSortClause } from "src/types/ElasticSortClause";
import { assertUnreachable } from "src/utils/assertUnreachable";

/**
 * How the fake maps one field. A `text` field also has an exact
 * `<field>.keyword`, as dynamic mapping gives every string.
 */
export type ElasticFakeFieldType = "text" | "keyword" | "number" | "boolean";

export type ElasticFakeDocument = Readonly<Record<string, unknown>> & {
  readonly id: string;
};

export type ElasticFakeCorpus = {
  index: string;
  mapping: Readonly<Record<string, ElasticFakeFieldType>>;
  documents: readonly ElasticFakeDocument[];
};

export type ElasticFakeHit = {
  _index: string;
  _id: string;
  _score: number | null;
  _source: ElasticFakeDocument;
  highlight?: Record<string, string[]>;
};

export type ElasticFakeBucket = {
  key: string | number;
  key_as_string?: string;
  doc_count: number;
};

export type ElasticFakeAggregate = {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: ElasticFakeBucket[];
};

export type ElasticFakeResponseBody = {
  took: number;
  timed_out: boolean;
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  hits: {
    total: { value: number; relation: "eq" | "gte" };
    hits: ElasticFakeHit[];
  };
  aggregations?: Record<string, ElasticFakeAggregate>;
};

/** The one document type the fake corpus holds. */
export type ElasticFakeProduct = {
  id: string;
  name: string;
  brand: string;
  price: number;
  inStock: boolean;
  tags: string[];
};

type MappedField = { source: string; type: ElasticFakeFieldType };

/**
 * `brand` is text with a keyword field beside it, as dynamic mapping maps
 * every string, and `tags` is mapped as a keyword outright, so an adapter
 * over this corpus reads `brand` through `keywords` and `tags` as it is
 * named.
 */
export const PRODUCT_MAPPING: Readonly<Record<string, ElasticFakeFieldType>> = {
  id: "keyword",
  name: "text",
  brand: "text",
  price: "number",
  inStock: "boolean",
  tags: "keyword",
};

export const PRODUCTS: readonly ElasticFakeProduct[] = [
  {
    id: "1",
    name: "Trail running shoe",
    brand: "Nimbus",
    price: 120,
    inStock: true,
    tags: ["sport", "shoe"],
  },
  {
    id: "2",
    name: "Road running shoe",
    brand: "Nimbus",
    price: 150,
    inStock: false,
    tags: ["sport", "shoe"],
  },
  {
    id: "3",
    name: "Leather dress shoe",
    brand: "Halden",
    price: 220,
    inStock: true,
    tags: ["formal"],
  },
  {
    id: "4",
    name: "Merino wool sock",
    brand: "Halden",
    price: 18,
    inStock: true,
    tags: ["sport"],
  },
  {
    id: "5",
    name: "Rain jacket",
    brand: "Vester",
    price: 310,
    inStock: false,
    tags: ["outdoor"],
  },
];

/** A terms aggregation returns this many buckets unless it asks for more. */
const TERMS_SIZE = 10;

// The standard analyzer, near enough: lowercased runs of letters and digits.
const TOKEN = /[\p{L}\p{N}]+/gu;

const getTokens = (text: string): readonly string[] =>
  text.toLowerCase().match(TOKEN) ?? [];

const getValues = (
  document: ElasticFakeDocument,
  field: string,
): readonly unknown[] => {
  if (!Object.hasOwn(document, field)) {
    return [];
  }

  const value = document[field];

  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [value];
};

const getMappedField = (
  corpus: ElasticFakeCorpus,
  name: string,
): MappedField | undefined => {
  const type = corpus.mapping[name];

  if (Object.hasOwn(corpus.mapping, name) && type !== undefined) {
    return { source: name, type };
  }

  const source = name.slice(0, -".keyword".length);

  if (name.endsWith(".keyword") && corpus.mapping[source] === "text") {
    return { source, type: "keyword" };
  }

  return undefined;
};

// Sorting and aggregating read one value per document, which the engine
// refuses to build for a text field.
const getDocValueField = (
  corpus: ElasticFakeCorpus,
  name: string,
): MappedField | undefined => {
  const mapped = getMappedField(corpus, name);

  if (mapped?.type === "text") {
    throw new Error(
      `Fielddata is disabled on [${name}] in [${corpus.index}]. Text fields are not optimised for operations that require per-document field data like aggregations and sorting.`,
    );
  }

  return mapped;
};

// A boolean is read as 1 or 0.
const getDocValues = (
  mapped: MappedField,
  document: ElasticFakeDocument,
): readonly (string | number)[] =>
  getValues(document, mapped.source).flatMap((value) => {
    if (typeof value === "boolean") {
      return [Number(value)];
    }

    if (typeof value === "number" || typeof value === "string") {
      return [value];
    }

    return [];
  });

// Keywords are ordered by their bytes, which for this corpus is code unit
// order.
const compareValues = (
  left: string | number,
  right: string | number,
): number => {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  if (String(left) < String(right)) {
    return -1;
  }

  if (String(left) > String(right)) {
    return 1;
  }

  return 0;
};

const matchesTerm = (
  corpus: ElasticFakeCorpus,
  name: string,
  value: FilterValue,
  document: ElasticFakeDocument,
): boolean => {
  const mapped = getMappedField(corpus, name);

  if (mapped === undefined) {
    return false;
  }

  return getValues(document, mapped.source).some((candidate) => {
    // A term is not analysed, so on a text field it meets each indexed
    // token, and "Nimbus" finds nothing in "nimbus".
    if (mapped.type === "text") {
      return (
        typeof candidate === "string" &&
        getTokens(candidate).includes(String(value))
      );
    }

    return candidate === value;
  });
};

const matchesRange = (
  corpus: ElasticFakeCorpus,
  name: string,
  range: ElasticRange,
  document: ElasticFakeDocument,
): boolean => {
  const mapped = getMappedField(corpus, name);

  if (mapped === undefined) {
    return false;
  }

  return getValues(document, mapped.source).some(
    (candidate) =>
      typeof candidate === "number" &&
      (range.gt === undefined || candidate > range.gt) &&
      (range.gte === undefined || candidate >= range.gte) &&
      (range.lt === undefined || candidate < range.lt) &&
      (range.lte === undefined || candidate <= range.lte),
  );
};

const matchesText = (
  corpus: ElasticFakeCorpus,
  text: { query: string; fields: readonly string[] },
  document: ElasticFakeDocument,
): boolean => {
  const tokens = getTokens(text.query);

  return text.fields.some((name) => {
    const mapped = getMappedField(corpus, name);

    if (mapped === undefined) {
      return false;
    }

    return getValues(document, mapped.source).some((candidate) => {
      if (typeof candidate !== "string") {
        return false;
      }

      // A keyword is not analysed, so only the whole query matches one.
      if (mapped.type === "keyword") {
        return candidate === text.query;
      }

      return getTokens(candidate).some((token) => tokens.includes(token));
    });
  });
};

// With nothing else required, the engine requires one should clause.
const getMinimumShouldMatch = (bool: ElasticBoolQuery): number => {
  if (bool.minimum_should_match !== undefined) {
    return bool.minimum_should_match;
  }

  const required = (bool.must ?? []).length + (bool.filter ?? []).length;

  if (required === 0 && (bool.should ?? []).length > 0) {
    return 1;
  }

  return 0;
};

const matchesQuery = (
  corpus: ElasticFakeCorpus,
  query: ElasticQuery,
  document: ElasticFakeDocument,
): boolean => {
  const matches = (clause: ElasticQuery) =>
    matchesQuery(corpus, clause, document);

  if ("match_all" in query) {
    return true;
  }

  if ("multi_match" in query) {
    return matchesText(corpus, query.multi_match, document);
  }

  if ("term" in query) {
    return Object.entries(query.term).every(([name, { value }]) =>
      matchesTerm(corpus, name, value, document),
    );
  }

  if ("terms" in query) {
    return Object.entries(query.terms).every(([name, values]) =>
      values.some((value) => matchesTerm(corpus, name, value, document)),
    );
  }

  if ("range" in query) {
    return Object.entries(query.range).every(([name, range]) =>
      matchesRange(corpus, name, range, document),
    );
  }

  if ("bool" in query) {
    const { bool } = query;
    const required = [...(bool.must ?? []), ...(bool.filter ?? [])];
    const matched = (bool.should ?? []).filter(matches).length;

    return (
      required.every(matches) &&
      !(bool.must_not ?? []).some(matches) &&
      matched >= getMinimumShouldMatch(bool)
    );
  }

  return assertUnreachable(query);
};

// Relevance keeps the corpus order. A document with several values sorts by
// its lowest ascending and its highest descending, and one without the field
// sorts last either way.
const getOrderedDocuments = (
  corpus: ElasticFakeCorpus,
  sort: readonly ElasticSortClause[] | undefined,
  documents: readonly ElasticFakeDocument[],
): readonly ElasticFakeDocument[] => {
  if (sort === undefined) {
    return documents;
  }

  const keys = sort.flatMap((clause) =>
    Object.entries(clause).map(([name, { order }]) => {
      const mapped = getDocValueField(corpus, name);

      if (mapped === undefined) {
        throw new Error(`No mapping found for [${name}] in order to sort on`);
      }

      return { mapped, order };
    }),
  );

  const getSortValue = (
    mapped: MappedField,
    order: SortDirection,
    document: ElasticFakeDocument,
  ) => {
    const values = [...getDocValues(mapped, document)].sort(compareValues);

    if (order === "asc") {
      return values[0];
    }

    return values.at(-1);
  };

  return [...documents].sort((left, right) => {
    for (const { mapped, order } of keys) {
      const a = getSortValue(mapped, order, left);
      const b = getSortValue(mapped, order, right);

      if (a === b) {
        continue;
      }

      if (a === undefined) {
        return 1;
      }

      if (b === undefined) {
        return -1;
      }

      if (order === "asc") {
        return compareValues(a, b);
      }

      return compareValues(b, a);
    }

    return 0;
  });
};

// Most documents first, ties by key, as a terms aggregation orders by
// default, and a document counts once per value however often it holds it.
const getAggregate = (
  corpus: ElasticFakeCorpus,
  name: string,
  documents: readonly ElasticFakeDocument[],
): ElasticFakeAggregate => {
  const mapped = getDocValueField(corpus, name);

  if (mapped === undefined) {
    return {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [],
    };
  }

  const counts = new Map<string | number, number>();

  for (const document of documents) {
    for (const value of new Set(getDocValues(mapped, document))) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  const buckets = [...counts]
    .map(([key, count]): ElasticFakeBucket => {
      // A boolean is spelled out beside its 1 or 0.
      if (mapped.type === "boolean") {
        return { key, key_as_string: String(key === 1), doc_count: count };
      }

      return { key, doc_count: count };
    })
    .sort((left, right) => {
      if (left.doc_count !== right.doc_count) {
        return right.doc_count - left.doc_count;
      }

      return compareValues(left.key, right.key);
    });

  return {
    doc_count_error_upper_bound: 0,
    sum_other_doc_count: buckets
      .slice(TERMS_SIZE)
      .reduce((sum, bucket) => sum + bucket.doc_count, 0),
    buckets: buckets.slice(0, TERMS_SIZE),
  };
};

// The text clauses that can match, which are what a highlight marks.
const getTextQueries = (
  query: ElasticQuery,
): { query: string; fields: readonly string[] }[] => {
  if ("multi_match" in query) {
    return [query.multi_match];
  }

  if ("bool" in query) {
    const { must = [], filter = [], should = [] } = query.bool;

    return [...must, ...filter, ...should].flatMap(getTextQueries);
  }

  return [];
};

const getMarkedValue = (
  value: string,
  tokens: readonly string[],
  tags: { pre: string; post: string },
): string | undefined => {
  let marked = "";
  let cursor = 0;

  for (const match of value.matchAll(TOKEN)) {
    if (!tokens.includes(match[0].toLowerCase())) {
      continue;
    }

    marked += `${value.slice(cursor, match.index)}${tags.pre}${match[0]}${tags.post}`;
    cursor = match.index + match[0].length;
  }

  if (cursor === 0) {
    return undefined;
  }

  return `${marked}${value.slice(cursor)}`;
};

// Only a text field the query searched is marked, as `require_field_match`
// defaults, and each value that matched comes back whole.
const getHighlight = (
  corpus: ElasticFakeCorpus,
  body: ElasticSearchBody,
  document: ElasticFakeDocument,
): Record<string, string[]> | undefined => {
  const { highlight } = body;

  if (highlight === undefined) {
    return undefined;
  }

  const tags = {
    pre: highlight.pre_tags[0] ?? "<em>",
    post: highlight.post_tags[0] ?? "</em>",
  };

  const texts = getTextQueries(body.query);
  const marked: Record<string, string[]> = {};

  for (const field of Object.keys(highlight.fields)) {
    const tokens = texts
      .filter((text) => text.fields.includes(field))
      .flatMap((text) => getTokens(text.query));

    if (getMappedField(corpus, field)?.type !== "text" || tokens.length === 0) {
      continue;
    }

    const values = getValues(document, field).flatMap((value) => {
      if (typeof value !== "string") {
        return [];
      }

      const wrapped = getMarkedValue(value, tokens, tags);

      if (wrapped === undefined) {
        return [];
      }

      return [wrapped];
    });

    if (values.length > 0) {
      marked[field] = values;
    }
  }

  if (Object.keys(marked).length === 0) {
    return undefined;
  }

  return marked;
};

const getHit = (
  corpus: ElasticFakeCorpus,
  body: ElasticSearchBody,
  document: ElasticFakeDocument,
): ElasticFakeHit => {
  const hit: ElasticFakeHit = {
    _index: corpus.index,
    _id: document.id,
    _score: 1,
    _source: document,
  };

  // A sorted search is not scored.
  if (body.sort !== undefined) {
    hit._score = null;
  }

  const highlight = getHighlight(corpus, body, document);

  if (highlight !== undefined) {
    hit.highlight = highlight;
  }

  return hit;
};

/**
 * Answers one search body from an in-memory corpus the way both engines do:
 * `bool`, `term`, `terms`, `range`, `match_all` and `multi_match` over a
 * near standard analyzer, sorts, pages, terms aggregations over every match,
 * and highlights of whole values. Like the engines, it compares a `term` on
 * a `text` field with the field's analysed tokens, and refuses to sort or
 * aggregate one, so a missing keyword mapping shows.
 *
 * It says nothing about relevance: matches keep the corpus order.
 *
 * @example
 * ```ts
 * const body = getResponseBodyFromCorpus(corpus, { query: { match_all: {} }, from: 0, size: 10 });
 * ```
 */
export const getResponseBodyFromCorpus = (
  corpus: ElasticFakeCorpus,
  body: ElasticSearchBody,
): ElasticFakeResponseBody => {
  const matched = corpus.documents.filter((document) =>
    matchesQuery(corpus, body.query, document),
  );

  const ordered = getOrderedDocuments(corpus, body.sort, matched);

  const response: ElasticFakeResponseBody = {
    took: 3,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: {
      total: { value: matched.length, relation: "eq" },
      hits: ordered
        .slice(body.from, body.from + body.size)
        .map((document) => getHit(corpus, body, document)),
    },
  };

  if (body.aggs !== undefined) {
    const aggregations: Record<string, ElasticFakeAggregate> = {};

    for (const [name, { terms }] of Object.entries(body.aggs)) {
      aggregations[name] = getAggregate(corpus, terms.field, matched);
    }

    response.aggregations = aggregations;
  }

  return response;
};
