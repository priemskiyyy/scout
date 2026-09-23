import { index } from "@priemskiyyy/scout";
import type {
  AdapterSearchRequest,
  AdapterSort,
  HighlightPart,
  StandardSchema,
} from "@priemskiyyy/scout";
import { matchesFilter } from "@priemskiyyy/scout/adapter";

import type { HttpRequest } from "src/types/HttpRequest";
import type { ScoutWireRefusal } from "src/types/ScoutWireRefusal";
import type { ScoutWireResponse } from "src/types/ScoutWireResponse";

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

export type FixtureBackend = {
  /** An application's own client, as `http()` takes it. */
  request: (
    request: HttpRequest<unknown>,
  ) => Promise<ScoutWireResponse | ScoutWireRefusal>;
  /** Every request the adapter made, in order. */
  requests: readonly HttpRequest<unknown>[];
};

export type FixtureBackendOptions = {
  /** Answers with exactly this, for an answer the corpus would not give. */
  answer?: ScoutWireResponse;
  /** Refuses every search with this message, in the wire format's refusal. */
  refusal?: string;
  /** Rejects with this, as a client does on a failed status. */
  fail?: unknown;
  /** Never answers until the signal aborts. */
  pending?: boolean;
  /** Reported as `took`. */
  took?: number;
};

const getFieldValue = (document: FixtureProduct, field: string): unknown =>
  Object.getOwnPropertyDescriptor(document, field)?.value;

const compareValues = (left: unknown, right: unknown) => {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right));
};

const getSorted = (
  documents: readonly FixtureProduct[],
  sort: AdapterSort | null,
) => {
  if (sort === null) {
    return documents;
  }

  return [...documents].sort((left, right) => {
    for (const { field, direction } of sort.by) {
      const order = compareValues(
        getFieldValue(left, field),
        getFieldValue(right, field),
      );

      if (order === 0) {
        continue;
      }

      if (direction === "asc") {
        return order;
      }

      return -order;
    }

    return 0;
  });
};

// Every character is kept, so the parts rejoin to exactly the field.
const getParts = (text: string, term: string) => {
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

const getHighlights = (
  document: FixtureProduct,
  fields: readonly string[],
  term: string,
) => {
  const highlights: Record<
    string,
    { path: string[]; parts: HighlightPart[]; truncated: boolean }[]
  > = {};

  for (const field of fields) {
    const text = getFieldValue(document, field);

    if (typeof text !== "string") {
      continue;
    }

    highlights[field] = [
      { path: [field], parts: getParts(text, term), truncated: false },
    ];
  }

  return highlights;
};

const getFacets = (
  documents: readonly FixtureProduct[],
  fields: readonly string[],
) => {
  const facets: Record<
    string,
    { values: { value: string | number; count: number }[]; exhaustive: boolean }
  > = {};

  for (const field of fields) {
    const counts = new Map<string | number, number>();

    for (const document of documents) {
      const value = getFieldValue(document, field);

      if (typeof value !== "string" && typeof value !== "number") {
        continue;
      }

      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    facets[field] = {
      values: [...counts].map(([value, count]) => ({ value, count })),
      exhaustive: true,
    };
  }

  return facets;
};

const isQueryMatch = (
  document: FixtureProduct,
  searchable: readonly string[],
  term: string,
) =>
  searchable.some((field) => {
    const text = getFieldValue(document, field);

    return typeof text === "string" && text.toLowerCase().includes(term);
  });

const getAnswer = (
  sent: AdapterSearchRequest<unknown>,
  took: number | undefined,
): ScoutWireResponse => {
  const term = sent.query.trim().toLowerCase();

  const matched = PRODUCTS.filter(
    (product) =>
      matchesFilter(sent.filter, product) &&
      isQueryMatch(product, sent.searchable, term),
  );

  const from = (sent.page.current - 1) * sent.page.size;

  const answer: ScoutWireResponse = {
    hits: getSorted(matched, sent.sort)
      .slice(from, from + sent.page.size)
      .map((document) => ({
        document,
        highlights: getHighlights(document, sent.highlights, term),
        // A backend is free to add its own keys; they arrive on `hit.native`.
        score: 1 / (PRODUCTS.indexOf(document) + 1),
      })),
    total: { value: matched.length, accuracy: "exact", scope: "matches" },
    facets: getFacets(matched, sent.facets),
  };

  if (took !== undefined) {
    answer.took = took;
  }

  return answer;
};

/**
 * A backend in memory behind an application's own client. It receives the
 * search as JSON, as a real one would, and really evaluates it: the query
 * over the searchable fields, the filter, the sort, the page, facet counts
 * over the matched set, and highlights that rejoin to the original text.
 *
 * @example
 * ```ts
 * const backend = createSearchBackend();
 * const adapter = http({ fingerprint: "catalogue-api", request: backend.request });
 * ```
 */
export const createSearchBackend = (
  options: FixtureBackendOptions = {},
): FixtureBackend => {
  const requests: HttpRequest<unknown>[] = [];

  const request = async (
    sent: HttpRequest<unknown>,
  ): Promise<ScoutWireResponse | ScoutWireRefusal> => {
    requests.push(sent);

    // A client rejects once its request is aborted, and holding the promise
    // open until then is what proves the signal really arrived.
    if (options.pending === true) {
      return await new Promise<ScoutWireResponse>((_resolve, reject) => {
        sent.signal.addEventListener("abort", () => {
          reject(new Error("The fixture backend request was aborted."));
        });
      });
    }

    if (options.fail !== undefined) {
      throw options.fail;
    }

    if (options.answer !== undefined) {
      return options.answer;
    }

    if (typeof options.refusal === "string") {
      return { refusal: { message: options.refusal } };
    }

    return getAnswer(JSON.parse(JSON.stringify(sent.search)), options.took);
  };

  return { request, requests };
};

const isProduct = (value: unknown): value is FixtureProduct =>
  typeof value === "object" &&
  value !== null &&
  typeof Object.getOwnPropertyDescriptor(value, "id")?.value === "string";

/** Reads a fixture document back as the product it is. */
export const productSchema: StandardSchema<FixtureProduct> = {
  "~standard": {
    version: 1,
    vendor: "http-fixture",
    validate: (value) => {
      if (isProduct(value)) {
        return { value };
      }

      return { issues: [{ message: "Not a product." }] };
    },
  },
};

/** The fixture corpus as an index declares it. */
export const productIndex = index({
  schema: productSchema,
  id: (product) => product.id,
  searchable: ["title", "brand"],
  filterable: ["brand", "category", "price"],
  facetable: { brand: "string", category: "string", price: "number" },
  highlightable: ["title"],
  sorts: { cheapest: { price: "asc" }, dearest: { price: "desc" } },
  profiles: { titles: { searchable: ["title"] } },
});
