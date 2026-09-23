import type {
  AdapterSearchRequest,
  HighlightFragment,
  HighlightPart,
  SearchTotal,
} from "@priemskiyyy/scout";
import { matchesFilter } from "@priemskiyyy/scout/adapter";
import type {
  ScoutWireHit,
  ScoutWireRefusal,
  ScoutWireResponse,
} from "@priemskiyyy/scout-http";

import {
  PAGING_WINDOW,
  TOTAL_CAP,
} from "examples/shared/outpost/constants/backend";
import type { BackendState } from "examples/shared/outpost/types/BackendState";
import type { Product } from "examples/shared/outpost/types/Product";
import { assertUnreachable } from "examples/shared/outpost/utils/assertUnreachable";

type Match = { product: Product; score: number };

type FacetValue = string | number | boolean;

const WORD = /[\p{L}\p{N}]+/gu;

// A name that matches says more than a description that does.
const FIELD_WEIGHTS: Readonly<Record<string, number>> = {
  name: 3,
  brand: 2,
  tags: 2,
  description: 1,
};

const getTerms = (text: string) =>
  Array.from(text.toLowerCase().matchAll(WORD), (match) => match[0]);

const getText = (product: Product, field: string) => {
  const value: unknown = Object.getOwnPropertyDescriptor(product, field)?.value;

  if (Array.isArray(value)) {
    return value.join(" ");
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
};

// Every term has to start some word of a searched field, so "tent" finds
// "tents" and "wat" finds "waterproof".
const getScore = (
  product: Product,
  terms: readonly string[],
  fields: readonly string[],
) => {
  let score = 0;

  for (const term of terms) {
    let found = 0;

    for (const field of fields) {
      const words = getTerms(getText(product, field));

      if (words.some((word) => word.startsWith(term))) {
        found += FIELD_WEIGHTS[field] ?? 1;
      }
    }

    if (found === 0) {
      return null;
    }

    score += found;
  }

  return score;
};

const compareValues = (left: unknown, right: unknown) => {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right));
};

const compareByRelevance = (left: Match, right: Match) => {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  return left.product.id.localeCompare(right.product.id);
};

const getSorted = (
  matches: Match[],
  sort: AdapterSearchRequest["sort"],
): Match[] => {
  if (sort === null) {
    return matches.sort(compareByRelevance);
  }

  return matches.sort((left, right) => {
    for (const { field, direction } of sort.by) {
      const order = compareValues(
        Object.getOwnPropertyDescriptor(left.product, field)?.value,
        Object.getOwnPropertyDescriptor(right.product, field)?.value,
      );

      if (order === 0) {
        continue;
      }

      if (direction === "desc") {
        return -order;
      }

      return order;
    }

    return left.product.id.localeCompare(right.product.id);
  });
};

const getTotal = (matched: number, state: BackendState): SearchTotal => {
  if (state.counting === "exact") {
    return { value: matched, accuracy: "exact", scope: "matches" };
  }

  // Rounded to the nearest ten, the way an engine that stops early guesses.
  if (state.counting === "estimated") {
    return {
      value: Math.max(10, Math.round(matched / 10) * 10),
      accuracy: "estimated",
      scope: "matches",
    };
  }

  if (state.counting === "capped") {
    if (matched > TOTAL_CAP) {
      return { value: TOTAL_CAP, accuracy: "lower-bound", scope: "matches" };
    }

    return { value: matched, accuracy: "exact", scope: "matches" };
  }

  return assertUnreachable(state.counting);
};

const getFacetValues = (product: Product, field: string): FacetValue[] => {
  const value: unknown = Object.getOwnPropertyDescriptor(product, field)?.value;

  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string");
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return [value];
  }

  return [];
};

// A sample counts the first half of the matches, as an engine that stops
// counting early does.
const getCounted = (matches: readonly Match[], state: BackendState) => {
  if (state.facetCounting === "sample") {
    return matches.slice(0, Math.ceil(matches.length / 2));
  }

  return matches;
};

const compareBuckets = (
  [leftValue, leftCount]: [FacetValue, number],
  [rightValue, rightCount]: [FacetValue, number],
) => {
  if (leftCount !== rightCount) {
    return rightCount - leftCount;
  }

  return compareValues(leftValue, rightValue);
};

const getFacets = (
  fields: readonly string[],
  matches: readonly Match[],
  state: BackendState,
): NonNullable<ScoutWireResponse["facets"]> => {
  const counted = getCounted(matches, state);

  const facets: Record<
    string,
    { values: { value: FacetValue; count: number }[]; exhaustive: boolean }
  > = {};

  for (const field of fields) {
    const counts = new Map<FacetValue, number>();

    for (const { product } of counted) {
      for (const value of getFacetValues(product, field)) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }

    facets[field] = {
      values: [...counts.entries()]
        .sort(compareBuckets)
        .map(([value, count]) => ({ value, count })),
      exhaustive: state.facetCounting === "every",
    };
  }

  return facets;
};

// The part of each word that a term starts is what matched.
const getParts = (text: string, terms: readonly string[]): HighlightPart[] => {
  const parts: HighlightPart[] = [];
  let cursor = 0;

  for (const match of text.matchAll(WORD)) {
    const word = match[0].toLowerCase();
    const term = terms.find((candidate) => word.startsWith(candidate));

    if (term === undefined) {
      continue;
    }

    const start = match.index;

    if (start > cursor) {
      parts.push({ text: text.slice(cursor, start), matched: false });
    }

    parts.push({ text: text.slice(start, start + term.length), matched: true });
    cursor = start + term.length;
  }

  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), matched: false });
  }

  return parts;
};

const getHighlights = (
  product: Product,
  fields: readonly string[],
  terms: readonly string[],
) => {
  const highlights: Record<string, HighlightFragment[]> = {};

  for (const field of fields) {
    const parts = getParts(getText(product, field), terms);

    if (!parts.some((part) => part.matched)) {
      continue;
    }

    highlights[field] = [{ path: [field], parts, truncated: false }];
  }

  return highlights;
};

// Past the window a page is empty, while the total still counts every match.
const getReach = (matches: readonly Match[], state: BackendState) => {
  if (state.paging === "window") {
    return PAGING_WINDOW;
  }

  return matches.length;
};

// The lab's corrupt document keeps its shape and loses its price, which only
// the schema notices.
const getDocument = (product: Product, index: number, state: BackendState) => {
  if (state.corruptDocument && index === 0) {
    return { ...product, price: "on request" };
  }

  return product;
};

/**
 * Your API's own search: it matches every word of the query against the
 * start of a word in the searched fields, filters with Scout's reference
 * matcher, sorts, pages and counts, and says as much about its totals and
 * facets as the lab lets it.
 *
 * @example
 * ```ts
 * const answer = answerSearch(search, PRODUCTS, state);
 * ```
 */
export const answerSearch = (
  search: AdapterSearchRequest,
  corpus: readonly Product[],
  state: BackendState,
): ScoutWireResponse | ScoutWireRefusal => {
  if (state.refuseHighlights && search.highlights.length > 0) {
    return {
      refusal: {
        message:
          "Your API's highlighter is switched off in the lab, so it refuses to highlight rather than return plain text as if nothing matched.",
      },
    };
  }

  const terms = getTerms(search.query);
  const matches: Match[] = [];

  for (const product of corpus) {
    const score = getScore(product, terms, search.searchable);

    if (score === null) {
      continue;
    }

    if (search.filter !== null && !matchesFilter(search.filter, product)) {
      continue;
    }

    matches.push({ product, score });
  }

  const sorted = getSorted(matches, search.sort);
  const start = (search.page.current - 1) * search.page.size;
  const end = Math.min(start + search.page.size, getReach(sorted, state));

  const hits: ScoutWireHit[] = sorted
    .slice(start, Math.max(start, end))
    .map(({ product, score }, index) => ({
      document: getDocument(product, index, state),
      highlights: getHighlights(product, search.highlights, terms),
      score,
    }));

  const response: ScoutWireResponse = {
    hits,
    total: getTotal(sorted.length, state),
    facets: getFacets(search.facets, sorted, state),
  };

  if (state.paging === "window") {
    return { ...response, retrievable: PAGING_WINDOW };
  }

  return response;
};
