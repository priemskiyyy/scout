import type {
  Client,
  estypes,
  TransportRequestOptions,
} from "@elastic/elasticsearch";
import type {
  ElasticHit,
  ElasticSearchResponseBody,
  ElasticTermsAggregate,
  ElasticTermsBucket,
  ElasticTotalHits,
} from "@priemskiyyy/scout-elastic-dsl";
import type {
  ElasticFakeAggregate,
  ElasticFakeDocument,
  ElasticFakeResponseBody,
} from "@priemskiyyy/scout-elastic-dsl/testing";
import { expectTypeOf } from "vitest";

import type { ElasticsearchSearchClient } from "src/types/ElasticsearchSearchClient";
import type { ElasticsearchSearchRequest } from "src/types/ElasticsearchSearchRequest";

/**
 * Pins the structural client, the structural request and response, and the
 * fake that stands in for them to the real `@elastic/elasticsearch` 9.5.1
 * types.
 *
 * The adapter imports no SDK, so nothing else would notice if the client
 * renamed a parameter, changed a value's type or stopped sending a field.
 * This file is the only place the two shapes meet, and it is type level
 * only: it compiles, it never runs.
 */

type RealTermsAggregate =
  | estypes.AggregationsStringTermsAggregate
  | estypes.AggregationsLongTermsAggregate
  | estypes.AggregationsDoubleTermsAggregate;

type RealResponse = estypes.SearchResponse<
  ElasticFakeDocument,
  Record<string, RealTermsAggregate>
>;

type RealHit = estypes.SearchHit<ElasticFakeDocument>;

// An application injects the client it already has, so the SDK's client has
// to satisfy the structural type without being annotated.
expectTypeOf<Client>().toExtend<ElasticsearchSearchClient>();

// Every request the adapter can send is one the client accepts, so a renamed
// or mistyped parameter is a compile error here rather than a silently
// ignored one on the wire.
expectTypeOf<ElasticsearchSearchRequest>().toExtend<estypes.SearchRequest>();

// `signal` is how a search is cancelled on the wire.
expectTypeOf<{ signal: AbortSignal }>().toExtend<TransportRequestOptions>();

// A real answer is readable through the structural types the adapter maps.
expectTypeOf<RealHit>().toExtend<ElasticHit>();
expectTypeOf<estypes.SearchTotalHits>().toExtend<ElasticTotalHits>();
expectTypeOf<Omit<RealResponse, "aggregations">>().toExtend<
  Omit<ElasticSearchResponseBody, "aggregations">
>();

// The client types an answer's aggregations by a type parameter, which it
// infers from the structural client, so a terms aggregation is pinned by the
// fields the adapter reads.
expectTypeOf<estypes.AggregationsStringTermsBucket>().toExtend<ElasticTermsBucket>();
expectTypeOf<estypes.AggregationsLongTermsBucket>().toExtend<ElasticTermsBucket>();
expectTypeOf<RealTermsAggregate["buckets"]>().toExtend<
  ElasticTermsAggregate["buckets"]
>();
expectTypeOf<RealTermsAggregate["sum_other_doc_count"]>().toExtend<
  ElasticTermsAggregate["sum_other_doc_count"]
>();
expectTypeOf<RealTermsAggregate["doc_count_error_upper_bound"]>().toExtend<
  ElasticTermsAggregate["doc_count_error_upper_bound"]
>();

// The fake answers with shapes the real client could have produced.
expectTypeOf<ElasticFakeResponseBody>().toExtend<RealResponse>();
expectTypeOf<ElasticFakeAggregate>().toExtend<RealTermsAggregate>();

// A boolean terms bucket is keyed 1 or 0, which is why `key_as_string` is
// passed on for the core to decode.
// @ts-expect-error a long terms bucket, which a boolean field aggregates into, is keyed by a number and not a boolean.
expectTypeOf<estypes.AggregationsLongTermsBucket["key"]>().toExtend<boolean>();

// A page size is a number, so a stringly typed one cannot reach the wire.
type StringPageSize = { size: string };
// @ts-expect-error size is a number in Elasticsearch.
expectTypeOf<StringPageSize>().toExtend<estypes.SearchRequest>();

// The adapter reads the body a search resolves with, which is what the
// client answers unless it is asked for `meta: true`.
type TransportResultClient = { search: () => Promise<{ body: RealResponse }> };
// @ts-expect-error a client answering with the transport result has the body under body, not at the top level.
expectTypeOf<TransportResultClient>().toExtend<ElasticsearchSearchClient>();
