import type { DialectGuide } from "examples/shared/outpost/types/DialectGuide";
import type { DialectId } from "examples/shared/outpost/types/DialectId";
import type { Option } from "examples/shared/outpost/types/Option";
import type { TranslationVariant } from "examples/shared/outpost/types/TranslationVariant";
import type { VariantGuide } from "examples/shared/outpost/types/VariantGuide";

export const DIALECT_IDS: DialectId[] = [
  "portable",
  "typesense",
  "algolia",
  "meilisearch",
  "elasticsearch",
  "opensearch",
  "mongodb",
];

export const DIALECT_GUIDES: Record<DialectId, DialectGuide> = {
  portable: {
    name: "Portable",
    packageName: "@priemskiyyy/scout",
    call: "What every adapter receives, and your API's JSON body",
  },
  typesense: {
    name: "Typesense",
    packageName: "@priemskiyyy/scout-typesense",
    call: "collections(name).documents().search(parameters)",
  },
  algolia: {
    name: "Algolia",
    packageName: "@priemskiyyy/scout-algolia",
    call: "searchSingleIndexWithHTTPInfo({ indexName, searchParams })",
  },
  meilisearch: {
    name: "Meilisearch",
    packageName: "@priemskiyyy/scout-meilisearch",
    call: "index.search(query, parameters)",
  },
  elasticsearch: {
    name: "Elasticsearch",
    packageName: "@priemskiyyy/scout-elasticsearch",
    call: "client.search({ index, ...body })",
  },
  opensearch: {
    name: "OpenSearch",
    packageName: "@priemskiyyy/scout-opensearch",
    call: "client.search({ index, body })",
  },
  mongodb: {
    name: "MongoDB Search",
    packageName: "@priemskiyyy/scout-mongodb",
    call: "collection.aggregate(pipeline)",
  },
};

export const VARIANT_GUIDES: Record<TranslationVariant, VariantGuide> = {
  store: {
    label: "The store's search",
    description: "Exactly the search the store just ran.",
  },
  negated: {
    label: "A negated group",
    description:
      "The store's search, excluding Vester and anything under $50. Algolia's filter grammar cannot negate a group, so it refuses.",
  },
  hostile: {
    label: "A hostile value",
    description:
      "A brand holding quotes, a backslash and a backtick. Typesense and Meilisearch escape it, the rest pass it as data, and none of them lets it change what the filter means.",
  },
  large: {
    label: "A page of 500",
    description:
      "Typesense returns at most 250 hits a page, so it refuses rather than hand back fewer than you asked for.",
  },
};

export const VARIANT_OPTIONS: Option<TranslationVariant>[] = [
  { value: "store", label: VARIANT_GUIDES.store.label },
  { value: "negated", label: VARIANT_GUIDES.negated.label },
  { value: "hostile", label: VARIANT_GUIDES.hostile.label },
  { value: "large", label: VARIANT_GUIDES.large.label },
];

/** A brand no catalogue should hold, built to break out of a filter string. */
export const HOSTILE_BRAND = 'He said "hi" \\ then `left`';
