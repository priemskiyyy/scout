import { index } from "@priemskiyyy/scout";
import type { StandardSchema } from "@priemskiyyy/scout";
import type { ElasticSearchResponseBody } from "@priemskiyyy/scout-elastic-dsl";
import {
  PRODUCT_MAPPING,
  PRODUCTS,
  getResponseBodyFromCorpus,
} from "@priemskiyyy/scout-elastic-dsl/testing";
import type {
  ElasticFakeProduct,
  ElasticFakeResponseBody,
} from "@priemskiyyy/scout-elastic-dsl/testing";

import type { ElasticsearchSearchClient } from "src/types/ElasticsearchSearchClient";
import type { ElasticsearchSearchRequest } from "src/types/ElasticsearchSearchRequest";

export type ElasticsearchFakeOptions = {
  documents?: readonly ElasticFakeProduct[];
  /** Amends what the fake computed, for a case only the engine produces. */
  respond?: (
    response: ElasticFakeResponseBody,
    request: ElasticsearchSearchRequest,
  ) => ElasticSearchResponseBody;
  /** Rejects every search with this reason, the way a transport failure does. */
  fail?: unknown;
};

export type ElasticsearchFake = {
  client: ElasticsearchSearchClient;
  /** Every request the adapter sent, oldest first. */
  calls: ElasticsearchSearchRequest[];
  /** The signal handed to each of those calls, so cancellation is provable. */
  signals: AbortSignal[];
  documents: readonly ElasticFakeProduct[];
};

/**
 * An in-process stand-in for the part of an Elasticsearch client this
 * adapter uses. It records every request it was given, and answers it from
 * a tiny product corpus through an engine that evaluates the query, the
 * filter, the sort, the page, the aggregations and the highlights, and that
 * compares a `term` on a `text` field with its tokens, as Elasticsearch does.
 *
 * It says nothing about Elasticsearch relevance.
 *
 * @example
 * ```ts
 * const fake = createElasticsearchFake();
 * const adapter = elasticsearch({ client: fake.client, index: "products" });
 * await adapter.search(request, { signal });
 * expect(fake.calls[0]?.size).toBe(20);
 * ```
 */
export const createElasticsearchFake = (
  options: ElasticsearchFakeOptions = {},
): ElasticsearchFake => {
  const documents = options.documents ?? PRODUCTS;
  const calls: ElasticsearchSearchRequest[] = [];
  const signals: AbortSignal[] = [];

  const client: ElasticsearchSearchClient = {
    search: async (request, { signal }) => {
      calls.push(request);
      signals.push(signal);

      if (signal.aborted) {
        throw signal.reason;
      }

      if (options.fail !== undefined) {
        throw options.fail;
      }

      const response = getResponseBodyFromCorpus(
        { index: request.index, mapping: PRODUCT_MAPPING, documents },
        request,
      );

      if (typeof options.respond !== "function") {
        return response;
      }

      return options.respond(response, request);
    },
  };

  return { client, calls, signals, documents };
};

const isProduct = (value: unknown): value is ElasticFakeProduct =>
  typeof value === "object" &&
  value !== null &&
  typeof Object.getOwnPropertyDescriptor(value, "id")?.value === "string";

/** Reads a fake document back as the product it is. */
export const productSchema: StandardSchema<ElasticFakeProduct> = {
  "~standard": {
    version: 1,
    vendor: "elasticsearch-fixture",
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
  highlightable: ["name"],
  sorts: { priceAsc: { price: "asc" } },
  profiles: { names: { searchable: ["name"] } },
});
