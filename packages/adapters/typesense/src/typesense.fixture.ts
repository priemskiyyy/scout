import { index } from "@priemskiyyy/scout";
import type { StandardSchema } from "@priemskiyyy/scout";

import type { TypesenseSearchClient } from "src/types/TypesenseSearchClient";
import type { TypesenseSearchParameters } from "src/types/TypesenseSearchParameters";

/** The one document type the fake corpus holds. */
export type TypesenseFakeProduct = {
  id: string;
  name: string;
  brand: string;
  price: number;
  inStock: boolean;
  tags: string[];
};

/** One highlighted field, shaped like the SDK's flat `highlights` entry. */
export type TypesenseFakeHighlight = {
  field: keyof TypesenseFakeProduct;
  snippet?: string;
  value?: string;
  snippets?: string[];
  indices?: number[];
  matched_tokens: string[] | string[][];
};

export type TypesenseFakeHit = {
  document: TypesenseFakeProduct;
  text_match: number;
  /**
   * The SDK's nested highlight map. The fake reports through the flat
   * `highlights` array instead, which is the form the adapter reads, so this
   * stays empty and only keeps the response shape honest.
   */
  highlight: Record<string, never>;
  highlights: TypesenseFakeHighlight[];
};

export type TypesenseFakeFacetCount = {
  field_name: keyof TypesenseFakeProduct;
  sampled: boolean;
  stats: { total_values?: number };
  counts: { count: number; highlighted: string; value: string }[];
};

export type TypesenseFakeResponse = {
  found: number;
  out_of: number;
  page: number;
  search_time_ms: number;
  search_cutoff?: boolean;
  request_params: { collection_name: string; q: string; per_page: number };
  hits: TypesenseFakeHit[];
  facet_counts: TypesenseFakeFacetCount[];
  grouped_hits?: { group_key: string[]; hits: TypesenseFakeHit[] }[];
};

export type TypesenseFakeOptions = {
  documents?: readonly TypesenseFakeProduct[];
  /** Amends what the fake computed, for a case only the engine produces. */
  respond?: (
    response: TypesenseFakeResponse,
    parameters: TypesenseSearchParameters,
  ) => TypesenseFakeResponse;
  /** Rejects every search with this reason, the way a transport failure does. */
  fail?: unknown;
};

export type TypesenseFake = {
  client: TypesenseSearchClient;
  /** Every parameter set the adapter sent, oldest first. */
  calls: TypesenseSearchParameters[];
  /** The signal handed to each of those calls, so cancellation is provable. */
  signals: (AbortSignal | null | undefined)[];
  documents: readonly TypesenseFakeProduct[];
};

const PRODUCTS: readonly TypesenseFakeProduct[] = [
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

const FACETABLE: readonly (keyof TypesenseFakeProduct)[] = [
  "brand",
  "price",
  "inStock",
  "tags",
];

const HIGHLIGHTABLE: readonly (keyof TypesenseFakeProduct)[] = [
  "name",
  "brand",
  "tags",
];

const isProductField = (name: string): name is keyof TypesenseFakeProduct =>
  name === "id" ||
  name === "name" ||
  name === "brand" ||
  name === "price" ||
  name === "inStock" ||
  name === "tags";

const readList = (value: string | undefined): readonly string[] => {
  if (value === undefined || value.length === 0) {
    return [];
  }

  return value.split(",");
};

const valuesOf = (
  document: TypesenseFakeProduct,
  field: keyof TypesenseFakeProduct,
): readonly string[] => {
  const value = document[field];

  if (Array.isArray(value)) {
    return value;
  }

  return [String(value)];
};

const contains = (haystack: string, needle: string): boolean =>
  haystack.toLowerCase().includes(needle.toLowerCase());

const wrapMatch = (
  value: string,
  query: string,
  start: string,
  end: string,
): string | null => {
  const at = value.toLowerCase().indexOf(query.toLowerCase());

  if (at === -1) {
    return null;
  }

  const after = at + query.length;

  return `${value.slice(0, at)}${start}${value.slice(at, after)}${end}${value.slice(after)}`;
};

const highlightsFor = (
  document: TypesenseFakeProduct,
  parameters: TypesenseSearchParameters,
  query: string,
): TypesenseFakeHighlight[] => {
  const requested = readList(parameters.highlight_fields);
  const start = parameters.highlight_start_tag ?? "<mark>";
  const end = parameters.highlight_end_tag ?? "</mark>";
  const highlights: TypesenseFakeHighlight[] = [];

  for (const field of HIGHLIGHTABLE) {
    if (!requested.includes(field) || query === "*") {
      continue;
    }

    const values = valuesOf(document, field);
    const snippets: string[] = [];
    const indices: number[] = [];

    values.forEach((value, index) => {
      const wrapped = wrapMatch(value, query, start, end);

      if (wrapped === null) {
        return;
      }

      snippets.push(wrapped);
      indices.push(index);
    });

    const first = snippets[0];

    if (first === undefined) {
      continue;
    }

    if (Array.isArray(document[field])) {
      highlights.push({
        field,
        snippets,
        indices,
        matched_tokens: [[query]],
      });
      continue;
    }

    highlights.push({ field, snippet: first, matched_tokens: [query] });
  }

  return highlights;
};

const facetsFor = (
  documents: readonly TypesenseFakeProduct[],
  parameters: TypesenseSearchParameters,
): TypesenseFakeFacetCount[] => {
  const requested = readList(parameters.facet_by);
  const facets: TypesenseFakeFacetCount[] = [];

  for (const field of FACETABLE) {
    if (!requested.includes(field)) {
      continue;
    }

    const tally = new Map<string, number>();

    for (const document of documents) {
      for (const value of valuesOf(document, field)) {
        tally.set(value, (tally.get(value) ?? 0) + 1);
      }
    }

    facets.push({
      field_name: field,
      sampled: false,
      stats: { total_values: tally.size },
      counts: [...tally.entries()].map(([value, count]) => ({
        value,
        count,
        highlighted: value,
      })),
    });
  }

  return facets;
};

const respondTo = (
  documents: readonly TypesenseFakeProduct[],
  parameters: TypesenseSearchParameters,
): TypesenseFakeResponse => {
  const query = parameters.q ?? "*";
  const fields = readList(parameters.query_by).filter(isProductField);

  const matched = documents.filter((document) => {
    if (query === "*") {
      return true;
    }

    return fields.some((field) =>
      valuesOf(document, field).some((value) => contains(value, query)),
    );
  });

  const size = parameters.per_page ?? 10;
  const page = parameters.page ?? 1;
  const from = (page - 1) * size;

  return {
    found: matched.length,
    out_of: documents.length,
    page,
    search_time_ms: 3,
    request_params: { collection_name: "products", q: query, per_page: size },
    hits: matched.slice(from, from + size).map((document, position) => ({
      document,
      text_match: 578730123365711400 - position,
      highlight: {},
      highlights: highlightsFor(document, parameters, query),
    })),
    facet_counts: facetsFor(matched, parameters),
  };
};

/**
 * An in-process stand-in for the part of a Typesense client this adapter uses.
 * It records every parameter set it was given, so a test can assert the exact
 * `filter_by`, `sort_by` and `facet_by` the adapter wrote, and answers from a
 * tiny product corpus with real facet counts and marker wrapped snippets.
 *
 * It says nothing about Typesense relevance. What it proves is translation.
 *
 * @example
 * ```ts
 * const fake = createTypesenseFake();
 * const adapter = typesense({ client: fake.client, collection: "products", ... });
 * await adapter.search(request, { signal });
 * expect(fake.calls[0]?.filter_by).toBe("brand:=`Nimbus`");
 * ```
 */
export const createTypesenseFake = (
  options: TypesenseFakeOptions = {},
): TypesenseFake => {
  const documents = options.documents ?? PRODUCTS;
  const calls: TypesenseSearchParameters[] = [];
  const signals: (AbortSignal | null | undefined)[] = [];

  const client: TypesenseSearchClient = {
    collections: () => ({
      documents: () => ({
        search: async (parameters, searchOptions) => {
          calls.push(parameters);
          signals.push(searchOptions.abortSignal);

          if (searchOptions.abortSignal?.aborted === true) {
            throw searchOptions.abortSignal.reason;
          }

          if (options.fail !== undefined) {
            throw options.fail;
          }

          const response = respondTo(documents, parameters);

          if (typeof options.respond !== "function") {
            return response;
          }

          return options.respond(response, parameters);
        },
      }),
    }),
  };

  return { client, calls, signals, documents };
};

const isProduct = (value: unknown): value is TypesenseFakeProduct =>
  typeof value === "object" &&
  value !== null &&
  typeof Object.getOwnPropertyDescriptor(value, "id")?.value === "string";

/** Reads a fake document back as the product it is. */
export const productSchema: StandardSchema<TypesenseFakeProduct> = {
  "~standard": {
    version: 1,
    vendor: "typesense-fixture",
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
  id: (product) => product.id,
  searchable: ["name", "brand", "tags"],
  filterable: ["brand", "price", "inStock", "tags"],
  facetable: {
    brand: "string",
    price: "number",
    inStock: "boolean",
    tags: "string",
  },
  highlightable: ["name", "tags"],
  sorts: { priceAsc: { price: "asc" } },
  profiles: { exact: { searchable: ["name"] } },
});
