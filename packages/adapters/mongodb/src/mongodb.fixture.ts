import { index } from "@priemskiyyy/scout";
import type { StandardSchema } from "@priemskiyyy/scout";

import type { MongoSearchCollection } from "src/types/MongoSearchCollection";
import type { MongoSearchCompound } from "src/types/MongoSearchCompound";
import type { MongoSearchExtras } from "src/types/MongoSearchExtras";
import type { MongoSearchExtrasExpression } from "src/types/MongoSearchExtrasExpression";
import type { MongoSearchHighlight } from "src/types/MongoSearchHighlight";
import type { MongoSearchMeta } from "src/types/MongoSearchMeta";
import type { MongoSearchOperator } from "src/types/MongoSearchOperator";
import type { MongoSearchPipelineStage } from "src/types/MongoSearchPipelineStage";
import type { MongoSearchRow } from "src/types/MongoSearchRow";
import type { MongoSearchStage } from "src/types/MongoSearchStage";
import { assertUnreachable } from "src/utils/assertUnreachable";

/** The one document type the fake corpus holds. */
export type MongoFakeProduct = {
  _id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  inStock: boolean;
  tags: string[];
};

export type MongoFakeOptions = {
  documents?: readonly MongoFakeProduct[];
  /** The search index the fake answers for, `"default"` unless given. */
  index?: string;
  /** The fields the fake's index maps as token. */
  tokens?: readonly string[];
  /** Amends what the fake computed, for a case only the engine produces. */
  respond?: (rows: readonly MongoSearchRow[]) => readonly MongoSearchRow[];
  /** Rejects every search with this reason, the way a transport failure does. */
  fail?: unknown;
};

export type MongoFake = {
  collection: MongoSearchCollection;
  /** Every pipeline the adapter sent, oldest first. */
  calls: MongoSearchPipelineStage[][];
  /** The signal handed to each of those calls, so cancellation is provable. */
  signals: AbortSignal[];
  documents: readonly MongoFakeProduct[];
};

type Candidate = {
  document: MongoFakeProduct;
  score: number;
  highlights: readonly MongoSearchHighlight[];
  extras?: MongoSearchExtras;
};

const PRODUCTS: readonly MongoFakeProduct[] = [
  {
    _id: "p1",
    name: "Trail running shoe",
    brand: "Nimbus",
    category: "shoes",
    price: 120,
    inStock: true,
    tags: ["sport", "shoe"],
  },
  {
    _id: "p2",
    name: "Road running shoe",
    brand: "Nimbus",
    category: "shoes",
    price: 150,
    inStock: false,
    tags: ["sport", "shoe"],
  },
  {
    _id: "p3",
    name: "Leather dress shoe",
    brand: "Halden",
    category: "shoes",
    price: 220,
    inStock: true,
    tags: ["formal"],
  },
  {
    _id: "p4",
    name: "Merino wool sock",
    brand: "Halden",
    category: "socks",
    price: 18,
    inStock: true,
    tags: ["sport"],
  },
  {
    _id: "p5",
    name: "Rain jacket",
    brand: "Vester",
    category: "jackets",
    price: 310,
    inStock: false,
    tags: ["outdoor"],
  },
];

// Every option a `$search` stage may carry here. MongoDB rejects a field it
// does not know, so the fake does too.
const STAGE_OPTIONS: readonly string[] = [
  "index",
  "compound",
  "facet",
  "count",
  "highlight",
  "sort",
  "concurrent",
  "returnStoredSource",
  "tracking",
];

/** MongoDB Search's default `numBuckets`. */
const FACET_BUCKETS = 10;

const WORD = /[\p{L}\p{N}]+/gu;

const getTerms = (text: string): string[] =>
  [...text.matchAll(WORD)].map((match) => match[0].toLowerCase());

const getValues = (
  document: MongoFakeProduct,
  path: string,
): readonly unknown[] => {
  const value: unknown = Object.getOwnPropertyDescriptor(document, path)?.value;

  if (value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
};

const isString = (value: unknown): value is string => typeof value === "string";

// What MongoDB Search requires of an exact comparison, which it does not
// relax for a test.
const assertComparable = (
  path: string,
  values: readonly unknown[],
  tokens: readonly string[],
): void => {
  if (new Set(values.map((value) => typeof value)).size > 1) {
    throw new Error(`in on ${path} mixes value types.`);
  }

  if (values.some(isString) && !tokens.includes(path)) {
    throw new Error(`${path} is not indexed as token.`);
  }
};

const getCompoundScore = (
  document: MongoFakeProduct,
  compound: MongoSearchCompound,
  tokens: readonly string[],
): number | null => {
  const must = compound.must ?? [];
  const filter = compound.filter ?? [];
  const should = compound.should ?? [];

  let score = 0;

  for (const clause of [...must, ...filter]) {
    const clauseScore = getScore(document, clause, tokens);

    if (clauseScore === null) {
      return null;
    }

    score += clauseScore;
  }

  for (const clause of compound.mustNot ?? []) {
    if (getScore(document, clause, tokens) !== null) {
      return null;
    }
  }

  let matched = 0;

  for (const clause of should) {
    const clauseScore = getScore(document, clause, tokens);

    if (clauseScore !== null) {
      matched += 1;
      score += clauseScore;
    }
  }

  // minimumShouldMatch defaults to 0, but a compound of should clauses alone
  // still needs one of them. A compound of mustNot clauses alone matches
  // every other document, as MongoDB Search does.
  let required = compound.minimumShouldMatch ?? 0;

  if (must.length + filter.length === 0 && should.length > 0) {
    required = Math.max(required, 1);
  }

  if (matched < required) {
    return null;
  }

  return score;
};

// The document's score, or null when the operator does not match it.
const getScore = (
  document: MongoFakeProduct,
  operator: MongoSearchOperator,
  tokens: readonly string[],
): number | null => {
  if ("text" in operator) {
    const terms = getTerms(operator.text.query);

    const matched = operator.text.path
      .flatMap((path) => getValues(document, path))
      .filter(isString)
      .flatMap((value) => getTerms(value))
      .filter((term) => terms.includes(term)).length;

    if (matched === 0) {
      return null;
    }

    return matched;
  }

  if ("exists" in operator) {
    if (getValues(document, operator.exists.path).length === 0) {
      return null;
    }

    return 0;
  }

  if ("equals" in operator) {
    const { path, value } = operator.equals;

    assertComparable(path, [value], tokens);

    if (!getValues(document, path).includes(value)) {
      return null;
    }

    return 0;
  }

  if ("in" in operator) {
    const { path, value } = operator.in;

    assertComparable(path, value, tokens);

    const values = getValues(document, path);

    if (!value.some((expected) => values.includes(expected))) {
      return null;
    }

    return 0;
  }

  if ("range" in operator) {
    const { path, gt, gte, lt, lte } = operator.range;

    const inside = getValues(document, path).some(
      (value) =>
        typeof value === "number" &&
        (gt === undefined || value > gt) &&
        (gte === undefined || value >= gte) &&
        (lt === undefined || value < lt) &&
        (lte === undefined || value <= lte),
    );

    if (!inside) {
      return null;
    }

    return 0;
  }

  if ("compound" in operator) {
    return getCompoundScore(document, operator.compound, tokens);
  }

  return assertUnreachable(operator);
};

// Only the clauses that score take part in highlighting.
const getTextOperators = (
  operator: MongoSearchOperator,
): { readonly query: string; readonly path: readonly string[] }[] => {
  if ("text" in operator) {
    return [operator.text];
  }

  if ("compound" in operator) {
    return [
      ...(operator.compound.must ?? []),
      ...(operator.compound.should ?? []),
    ].flatMap((clause) => getTextOperators(clause));
  }

  return [];
};

const getHighlight = (
  path: string,
  value: string,
  terms: readonly string[],
): MongoSearchHighlight | null => {
  const texts: { value: string; type: "hit" | "text" }[] = [];
  let from = 0;

  for (const match of value.matchAll(WORD)) {
    if (!terms.includes(match[0].toLowerCase())) {
      continue;
    }

    if (match.index > from) {
      texts.push({ value: value.slice(from, match.index), type: "text" });
    }

    texts.push({ value: match[0], type: "hit" });
    from = match.index + match[0].length;
  }

  if (texts.length === 0) {
    return null;
  }

  if (from < value.length) {
    texts.push({ value: value.slice(from), type: "text" });
  }

  return { path, texts, score: 1 };
};

const getHighlights = (
  document: MongoFakeProduct,
  operator: MongoSearchOperator,
  paths: readonly string[],
): MongoSearchHighlight[] => {
  const highlights: MongoSearchHighlight[] = [];

  for (const path of paths) {
    const terms = getTextOperators(operator)
      .filter((text) => text.path.includes(path))
      .flatMap((text) => getTerms(text.query));

    for (const value of getValues(document, path).filter(isString)) {
      const highlight = getHighlight(path, value, terms);

      if (highlight !== null) {
        highlights.push(highlight);
      }
    }
  }

  return highlights;
};

// A missing value is the lowest, so it comes first in ascending order.
const compareValues = (left: unknown, right: unknown): number => {
  if (left === right) {
    return 0;
  }

  if (left === undefined) {
    return -1;
  }

  if (right === undefined) {
    return 1;
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }

  if (isString(left) && isString(right)) {
    return left.localeCompare(right);
  }

  throw new Error("The fake sorts values of one type.");
};

const compareBy = (
  left: MongoFakeProduct,
  right: MongoFakeProduct,
  sort: Readonly<Record<string, 1 | -1>>,
  tokens: readonly string[],
): number => {
  for (const [path, order] of Object.entries(sort)) {
    const [leftValue] = getValues(left, path);
    const [rightValue] = getValues(right, path);

    if (isString(leftValue) && !tokens.includes(path)) {
      throw new Error(`${path} is not indexed as token, so it cannot sort.`);
    }

    const compared = compareValues(leftValue, rightValue);

    if (compared !== 0) {
      return compared * order;
    }
  }

  return 0;
};

const getFacetBuckets = (
  candidates: readonly Candidate[],
  path: string,
): { _id: string; count: number }[] => {
  const tally = new Map<string, number>();

  for (const { document } of candidates) {
    for (const value of getValues(document, path).filter(isString)) {
      tally.set(value, (tally.get(value) ?? 0) + 1);
    }
  }

  return [...tally.entries()]
    .sort(([leftValue, leftCount], [rightValue, rightCount]) => {
      if (leftCount !== rightCount) {
        return rightCount - leftCount;
      }

      return leftValue.localeCompare(rightValue);
    })
    .slice(0, FACET_BUCKETS)
    .map(([_id, count]) => ({ _id, count }));
};

const getCount = (
  stage: MongoSearchStage,
  matched: number,
): NonNullable<MongoSearchMeta["count"]> => {
  if (stage.count.type === "total") {
    return { total: matched };
  }

  if (stage.count.type === "lowerBound") {
    return { lowerBound: matched };
  }

  return assertUnreachable(stage.count.type);
};

const getMeta = (
  candidates: readonly Candidate[],
  stage: MongoSearchStage,
  tokens: readonly string[],
): MongoSearchMeta => {
  const count = getCount(stage, candidates.length);

  if (stage.facet === undefined) {
    return { count };
  }

  const facet: Record<string, { buckets: { _id: string; count: number }[] }> =
    {};

  for (const [name, definition] of Object.entries(stage.facet.facets)) {
    if (definition.type !== "string" || !tokens.includes(definition.path)) {
      throw new Error(`${definition.path} is not indexed as token.`);
    }

    facet[name] = { buckets: getFacetBuckets(candidates, definition.path) };
  }

  return { count, facet };
};

const getOperator = (stage: MongoSearchStage): MongoSearchOperator => {
  if (stage.compound !== undefined && stage.facet === undefined) {
    return { compound: stage.compound };
  }

  if (stage.facet !== undefined && stage.compound === undefined) {
    return stage.facet.operator;
  }

  throw new Error("$search takes exactly one operator or collector.");
};

const getExtras = (
  expression: MongoSearchExtrasExpression,
  candidate: Candidate,
  meta: MongoSearchMeta,
  stage: MongoSearchStage,
): MongoSearchExtras => {
  if (
    expression.meta !== "$$SEARCH_META" ||
    expression.score.$meta !== "searchScore"
  ) {
    throw new Error("The fake reads $$SEARCH_META and searchScore only.");
  }

  if (expression.highlights === undefined) {
    return { meta, score: candidate.score };
  }

  if (
    expression.highlights.$meta !== "searchHighlights" ||
    stage.highlight === undefined
  ) {
    throw new Error("searchHighlights needs the highlight option.");
  }

  return { meta, score: candidate.score, highlights: candidate.highlights };
};

const respondTo = (
  documents: readonly MongoFakeProduct[],
  pipeline: readonly MongoSearchPipelineStage[],
  searchIndex: string,
  tokens: readonly string[],
): MongoSearchRow[] => {
  const [first, ...rest] = pipeline;

  if (first === undefined || !("$search" in first)) {
    throw new Error("$search must be the first stage.");
  }

  const stage = first.$search;

  for (const [key, value] of Object.entries(stage)) {
    if (!STAGE_OPTIONS.includes(key)) {
      throw new Error(`$search has no option ${key}.`);
    }

    // The driver serialises undefined as null unless told to ignore it.
    if (value === undefined) {
      throw new Error(`$search.${key} would be sent as null.`);
    }
  }

  // MongoDB answers a search on an index that does not exist with nothing.
  if (stage.index !== searchIndex) {
    return [];
  }

  const operator = getOperator(stage);
  const matched: Candidate[] = [];

  for (const document of documents) {
    const score = getScore(document, operator, tokens);

    if (score === null) {
      continue;
    }

    matched.push({
      document,
      score,
      highlights: getHighlights(
        document,
        operator,
        stage.highlight?.path ?? [],
      ),
    });
  }

  const { sort } = stage;

  // Array sorting is stable, so equal scores keep the corpus order.
  let candidates = [...matched].sort((left, right) => {
    if (sort === undefined) {
      return right.score - left.score;
    }

    return compareBy(left.document, right.document, sort, tokens);
  });

  const meta = getMeta(matched, stage, tokens);

  for (const next of rest) {
    if ("$search" in next) {
      throw new Error("$search must be the first stage.");
    }

    if ("$skip" in next) {
      candidates = candidates.slice(next.$skip);
      continue;
    }

    if ("$limit" in next) {
      candidates = candidates.slice(0, next.$limit);
      continue;
    }

    if ("$set" in next) {
      candidates = candidates.map((candidate) => ({
        ...candidate,
        extras: getExtras(next.$set.__scout, candidate, meta, stage),
      }));
      continue;
    }

    assertUnreachable(next);
  }

  return candidates.map(({ document, extras }) => {
    if (extras === undefined) {
      throw new Error("The fake answers only a pipeline that sets __scout.");
    }

    return { ...document, __scout: extras };
  });
};

/**
 * An in-process stand-in for the part of a MongoDB `Collection` this adapter
 * uses. It evaluates the pipeline it is given over a tiny product corpus: the
 * `$search` operators, the count, string facets, highlights, the sort, the
 * page and the metadata `$set` adds. It rejects what MongoDB Search rejects,
 * such as a string compared on a field not indexed as token, matches nothing
 * where MongoDB leaves the answer undocumented, and records every pipeline, so
 * a test can also assert what was sent.
 *
 * It says nothing about analyzers or relevance. What it proves is translation.
 *
 * @example
 * ```ts
 * const fake = createMongoFake();
 * const adapter = mongodb({ collection: fake.collection, tokens: ["brand"] });
 * await adapter.search(request, { signal });
 * expect(fake.calls[0]?.[0]).toHaveProperty("$search");
 * ```
 */
export const createMongoFake = (options: MongoFakeOptions = {}): MongoFake => {
  const documents = options.documents ?? PRODUCTS;
  const searchIndex = options.index ?? "default";
  const tokens = options.tokens ?? ["brand", "category", "tags"];
  const calls: MongoSearchPipelineStage[][] = [];
  const signals: AbortSignal[] = [];

  const collection: MongoSearchCollection = {
    dbName: "shop",
    collectionName: "products",
    aggregate: (pipeline, { signal }) => {
      calls.push(pipeline);
      signals.push(signal);

      return {
        toArray: async () => {
          // The driver rejects with the signal's own reason.
          if (signal.aborted) {
            throw signal.reason;
          }

          if (options.fail !== undefined) {
            throw options.fail;
          }

          const rows = respondTo(documents, pipeline, searchIndex, tokens);

          if (typeof options.respond !== "function") {
            return rows;
          }

          return options.respond(rows);
        },
      };
    },
  };

  return { collection, calls, signals, documents };
};

const isProduct = (value: unknown): value is MongoFakeProduct =>
  typeof value === "object" &&
  value !== null &&
  typeof Object.getOwnPropertyDescriptor(value, "_id")?.value === "string";

/** Reads a fake document back as the product it is. */
export const productSchema: StandardSchema<MongoFakeProduct> = {
  "~standard": {
    version: 1,
    vendor: "mongodb-fixture",
    validate: (value) => {
      if (isProduct(value)) {
        return { value };
      }

      return { issues: [{ message: "Not a product." }] };
    },
  },
};

/** The fake corpus as an index declares it. */
export const productIndex = index({
  schema: productSchema,
  id: (product) => product._id,
  searchable: ["name", "brand"],
  filterable: ["brand", "category", "price", "inStock", "tags"],
  facetable: { brand: "string", category: "string" },
  highlightable: ["name"],
  sorts: { priceAsc: { price: "asc" } },
  profiles: { names: { searchable: ["name"] } },
});
