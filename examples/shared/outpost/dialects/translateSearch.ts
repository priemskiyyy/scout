import { Scout, ScoutError } from "@priemskiyyy/scout";
import type { SearchIndex } from "@priemskiyyy/scout";
import { algolia } from "@priemskiyyy/scout-algolia";
import { elasticsearch } from "@priemskiyyy/scout-elasticsearch";
import type { ElasticsearchSearchResponse } from "@priemskiyyy/scout-elasticsearch";
import { http } from "@priemskiyyy/scout-http";
import { meilisearch } from "@priemskiyyy/scout-meilisearch";
import { mongodb } from "@priemskiyyy/scout-mongodb";
import { opensearch } from "@priemskiyyy/scout-opensearch";
import { typesense } from "@priemskiyyy/scout-typesense";

import { formatError } from "examples/shared/outpost/formatting/formatError";
import { createProductIndex } from "examples/shared/outpost/utils/createProductIndex";
import type { DialectId } from "examples/shared/outpost/types/DialectId";
import type { StoreSearch } from "examples/shared/outpost/types/StoreSearch";
import type { StoreShape } from "examples/shared/outpost/types/StoreShape";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import type { Translation } from "examples/shared/outpost/types/Translation";
import type { TranslationVariant } from "examples/shared/outpost/types/TranslationVariant";
import { assertUnreachable } from "examples/shared/outpost/utils/assertUnreachable";
import { buildStoreSearch } from "examples/shared/outpost/utils/buildStoreSearch";
import { HOSTILE_BRAND } from "examples/shared/outpost/constants/dialects";

// An empty answer in each engine's own shape, so the adapter can finish.
const EMPTY_ELASTIC_BODY: ElasticsearchSearchResponse = {
  took: 0,
  timed_out: false,
  _shards: { failed: 0 },
  hits: { total: { value: 0, relation: "eq" }, hits: [] },
};

const KEYWORDS = { brand: "brand.keyword", category: "category.keyword" };

const getVariantSearch = (search: StoreSearch, variant: TranslationVariant) => {
  if (variant === "store") {
    return search;
  }

  if (variant === "negated") {
    return search.where((product, { not, or }) =>
      not(or(product.brand.eq("Vester"), product.price.lt(50))),
    );
  }

  if (variant === "hostile") {
    return search.where((product) => product.brand.eq(HOSTILE_BRAND));
  }

  if (variant === "large") {
    return search.page({ size: 500 });
  }

  return assertUnreachable(variant);
};

type DialectIndex = { index: SearchIndex<StoreShape>; dispose: () => void };

// Each dialect gets a Scout of its own, over the same declaration named
// `products`, with a client that records what it was handed.
const createDialectIndex = (
  dialect: DialectId,
  record: (request: unknown) => void,
): DialectIndex => {
  const products = createProductIndex("error");

  if (dialect === "portable") {
    const scout = new Scout({
      indexes: { products },
      adapters: {
        products: http({
          fingerprint: "portable",
          request: async ({ search }) => {
            record(search);

            return { hits: [] };
          },
        }),
      },
    });

    return { index: scout.index("products"), dispose: scout.dispose };
  }

  if (dialect === "typesense") {
    const scout = new Scout({
      indexes: { products },
      adapters: {
        products: typesense({
          client: {
            collections: () => ({
              documents: () => ({
                search: async (parameters) => {
                  record(parameters);

                  return { found: 0, page: 1, hits: [] };
                },
              }),
            }),
          },
          collection: "products",
        }),
      },
    });

    return { index: scout.index("products"), dispose: scout.dispose };
  }

  // Algolia sorts with replicas, so each declared sort names one.
  if (dialect === "algolia") {
    const scout = new Scout({
      indexes: { products },
      adapters: {
        products: algolia({
          client: {
            searchSingleIndex: async (props) => {
              record(props);

              return { hits: [] };
            },
            searchSingleIndexWithHTTPInfo: async (props) => {
              record(props);

              return { data: { hits: [] } };
            },
          },
          indexName: "products",
          replicas: {
            priceAsc: "products_price_asc",
            priceDesc: "products_price_desc",
            topRated: "products_top_rated",
          },
        }),
      },
    });

    return { index: scout.index("products"), dispose: scout.dispose };
  }

  if (dialect === "meilisearch") {
    const scout = new Scout({
      indexes: { products },
      adapters: {
        products: meilisearch({
          index: {
            uid: "products",
            search: async (query, parameters) => {
              record({ q: query, ...parameters });

              return { hits: [] };
            },
          },
        }),
      },
    });

    return { index: scout.index("products"), dispose: scout.dispose };
  }

  if (dialect === "elasticsearch") {
    const scout = new Scout({
      indexes: { products },
      adapters: {
        products: elasticsearch({
          client: {
            search: async (request) => {
              record(request);

              return EMPTY_ELASTIC_BODY;
            },
          },
          index: "products",
          keywords: KEYWORDS,
        }),
      },
    });

    return { index: scout.index("products"), dispose: scout.dispose };
  }

  if (dialect === "opensearch") {
    const scout = new Scout({
      indexes: { products },
      adapters: {
        products: opensearch({
          client: {
            search: (request) => {
              record(request);

              return Object.assign(
                Promise.resolve({ body: EMPTY_ELASTIC_BODY }),
                { abort: () => {} },
              );
            },
          },
          index: "products",
          keywords: KEYWORDS,
        }),
      },
    });

    return { index: scout.index("products"), dispose: scout.dispose };
  }

  if (dialect === "mongodb") {
    const scout = new Scout({
      indexes: { products },
      adapters: {
        products: mongodb({
          collection: {
            dbName: "outpost",
            collectionName: "products",
            aggregate: (pipeline) => {
              record(pipeline);

              return { toArray: async () => [] };
            },
          },
          tokens: ["brand", "category", "tags"],
        }),
      },
    });

    return { index: scout.index("products"), dispose: scout.dispose };
  }

  return assertUnreachable(dialect);
};

const translate = async (
  dialect: DialectId,
  state: StoreState,
  variant: TranslationVariant,
): Promise<Translation> => {
  const sent: unknown[] = [];

  const { index, dispose } = createDialectIndex(dialect, (request) => {
    sent.push(request);
  });

  const search = getVariantSearch(buildStoreSearch(index, state), variant);

  try {
    const result = await search.execute();

    if (result.native === null) {
      return { kind: "answered-by-scout" };
    }

    return { kind: "sent", request: sent[0] };
  } catch (error) {
    // What the client was handed is the translation, whatever the empty
    // answer then did.
    if (sent.length > 0) {
      return { kind: "sent", request: sent[0] };
    }

    if (error instanceof ScoutError && error.code === "unsupported-feature") {
      return { kind: "refused", message: error.message };
    }

    return { kind: "failed", message: formatError(error) };
  } finally {
    dispose();
  }
};

/**
 * The store's search as six more adapters would send it, and the portable
 * request every adapter receives. Each adapter gets a client that records
 * what it was handed and answers with nothing, so nothing is sent anywhere,
 * and what an adapter refuses it refuses before its client is called.
 *
 * @example
 * ```ts
 * const translations = await translateSearch(state, "negated");
 * translations.algolia; // { kind: "refused", message: "..." }
 * ```
 */
export const translateSearch = async (
  state: StoreState,
  variant: TranslationVariant,
): Promise<Record<DialectId, Translation>> => {
  const [
    portable,
    typesenseTranslation,
    algoliaTranslation,
    meilisearchTranslation,
    elasticsearchTranslation,
    opensearchTranslation,
    mongodbTranslation,
  ] = await Promise.all([
    translate("portable", state, variant),
    translate("typesense", state, variant),
    translate("algolia", state, variant),
    translate("meilisearch", state, variant),
    translate("elasticsearch", state, variant),
    translate("opensearch", state, variant),
    translate("mongodb", state, variant),
  ]);

  return {
    portable,
    typesense: typesenseTranslation,
    algolia: algoliaTranslation,
    meilisearch: meilisearchTranslation,
    elasticsearch: elasticsearchTranslation,
    opensearch: opensearchTranslation,
    mongodb: mongodbTranslation,
  };
};
