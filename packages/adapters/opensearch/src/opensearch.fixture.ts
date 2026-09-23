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

import type { OpenSearchSearchClient } from "src/types/OpenSearchSearchClient";
import type { OpenSearchSearchRequest } from "src/types/OpenSearchSearchRequest";

/** What the client resolves with: the answer under `body`, beside the transport's own fields. */
export type OpenSearchFakeResponse = {
  body: ElasticSearchResponseBody;
  statusCode: number;
  headers: Record<string, string>;
  warnings: string[] | null;
};

export type OpenSearchFakeOptions = {
  documents?: readonly ElasticFakeProduct[];
  /** Amends what the fake computed, for a case only the engine produces. */
  respond?: (
    response: ElasticFakeResponseBody,
    request: OpenSearchSearchRequest,
  ) => ElasticSearchResponseBody;
  /** Rejects every search with this reason, the way a transport failure does. */
  fail?: unknown;
  /** Keeps every search open until it is aborted, the way a slow cluster does. */
  hold?: boolean;
};

export type OpenSearchFake = {
  client: OpenSearchSearchClient;
  /** Every request the adapter sent, oldest first. */
  calls: OpenSearchSearchRequest[];
  /** Every request whose `abort()` was called, so cancellation is provable. */
  aborts: OpenSearchSearchRequest[];
  documents: readonly ElasticFakeProduct[];
};

/**
 * An in-process stand-in for the part of an OpenSearch client this adapter
 * uses. It records every request it was given and every one aborted, and
 * answers from a tiny product corpus through an engine that evaluates the
 * query, the filter, the sort, the page, the aggregations and the
 * highlights, and that compares a `term` on a `text` field with its tokens,
 * as OpenSearch does.
 *
 * It says nothing about OpenSearch relevance.
 *
 * @example
 * ```ts
 * const fake = createOpenSearchFake();
 * const adapter = opensearch({ client: fake.client, index: "products" });
 * await adapter.search(request, { signal });
 * expect(fake.calls[0]?.body.size).toBe(20);
 * ```
 */
export const createOpenSearchFake = (
  options: OpenSearchFakeOptions = {},
): OpenSearchFake => {
  const documents = options.documents ?? PRODUCTS;
  const calls: OpenSearchSearchRequest[] = [];
  const aborts: OpenSearchSearchRequest[] = [];

  const answer = (request: OpenSearchSearchRequest) => {
    const response = getResponseBodyFromCorpus(
      { index: request.index, mapping: PRODUCT_MAPPING, documents },
      request.body,
    );

    if (typeof options.respond !== "function") {
      return response;
    }

    return options.respond(response, request);
  };

  const client: OpenSearchSearchClient = {
    search: (request) => {
      calls.push(request);

      let rejectSearch: (reason: unknown) => void = () => undefined;

      const pending = new Promise<OpenSearchFakeResponse>((resolve, reject) => {
        rejectSearch = reject;

        if (options.hold === true) {
          return;
        }

        if (options.fail !== undefined) {
          reject(options.fail);

          return;
        }

        resolve({
          body: answer(request),
          statusCode: 200,
          headers: {},
          warnings: null,
        });
      });

      // The client rejects an aborted request with a RequestAbortedError.
      const abort = () => {
        aborts.push(request);
        rejectSearch(new Error("Request aborted"));
      };

      return Object.assign(pending, { abort });
    },
  };

  return { client, calls, aborts, documents };
};

const isProduct = (value: unknown): value is ElasticFakeProduct =>
  typeof value === "object" &&
  value !== null &&
  typeof Object.getOwnPropertyDescriptor(value, "id")?.value === "string";

/** Reads a fake document back as the product it is. */
export const productSchema: StandardSchema<ElasticFakeProduct> = {
  "~standard": {
    version: 1,
    vendor: "opensearch-fixture",
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
