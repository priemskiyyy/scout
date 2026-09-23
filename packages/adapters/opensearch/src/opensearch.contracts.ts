import type { API, Client, Types } from "@opensearch-project/opensearch";
import type {
  ElasticHit,
  ElasticSearchResponseBody,
  ElasticTermsAggregate,
  ElasticTotalHits,
} from "@priemskiyyy/scout-elastic-dsl";
import type {
  ElasticFakeHit,
  ElasticFakeResponseBody,
} from "@priemskiyyy/scout-elastic-dsl/testing";
import { expectTypeOf } from "vitest";

import type { OpenSearchFakeResponse } from "src/opensearch.fixture";
import type { OpenSearchSearchClient } from "src/types/OpenSearchSearchClient";
import type { OpenSearchSearchRequest } from "src/types/OpenSearchSearchRequest";

/**
 * Pins the structural client, the structural request and response, and the
 * fake that stands in for them to the real `@opensearch-project/opensearch`
 * 3.6.0 types.
 *
 * The adapter imports no SDK, so nothing else would notice if the client
 * renamed a parameter, changed a value's type or stopped sending a field.
 * This file is the only place the two shapes meet, and it is type level
 * only: it compiles, it never runs.
 */

type RealBody = API.Search_ResponseBody;
type RealHit = Types.Core_Search.Hit;
type RealAggregate = NonNullable<RealBody["aggregations"]>[string];

// An application injects the client it already has, so the SDK's client has
// to satisfy the structural type without being annotated.
expectTypeOf<Client>().toExtend<OpenSearchSearchClient>();

// Every request the adapter can send is one the client accepts, so a renamed
// or mistyped parameter is a compile error here rather than a silently
// ignored one on the wire.
expectTypeOf<OpenSearchSearchRequest>().toExtend<API.Search_Request>();

// The promise a search returns is what cancels it, because the client takes
// no signal.
expectTypeOf<ReturnType<Client["search"]>>().toHaveProperty("abort");

// A real answer is readable through the structural types the adapter maps.
expectTypeOf<API.Search_Response>().toExtend<{
  body: ElasticSearchResponseBody;
}>();
expectTypeOf<RealHit>().toExtend<ElasticHit>();
expectTypeOf<RealAggregate>().toExtend<ElasticTermsAggregate>();
expectTypeOf<NonNullable<RealBody["hits"]["total"]>>().toExtend<
  ElasticTotalHits | number
>();

// The fake answers with shapes the real client could have produced. Its hits
// are pinned one at a time, for the reason the negative case below states.
expectTypeOf<Omit<ElasticFakeResponseBody, "hits">>().toExtend<
  Omit<RealBody, "hits">
>();
expectTypeOf<Omit<ElasticFakeHit, "_score">>().toExtend<RealHit>();
expectTypeOf<Omit<OpenSearchFakeResponse, "body">>().toExtend<
  Omit<API.Search_Response, "body" | "meta">
>();

// `hits.hits` is typed `Hit & { _source?: T }[]` in 3.6.0, which binds as one
// hit intersected with an array, so no list of hits satisfies the SDK's own
// type and each element reads as `{ _source?: T }` alone. The structural hit
// is all optional, so a real answer still reads through it.
// @ts-expect-error hits.hits is one hit intersected with an array in @opensearch-project/opensearch 3.6.0, so a real list of hits is rejected.
expectTypeOf<ElasticFakeResponseBody>().toExtend<RealBody>();

// A sorted search answers `_score: null`, as Elasticsearch does, which
// 3.6.0 types as a number alone. The structural hit admits null.
// @ts-expect-error _score is typed without null in @opensearch-project/opensearch 3.6.0, although a sorted search answers null.
expectTypeOf<ElasticFakeHit["_score"]>().toExtend<RealHit["_score"]>();

// The answer is under `body`, beside the transport's own fields, so a client
// that resolved with the answer itself is not this client.
type BodyOnlyClient = {
  search: (request: OpenSearchSearchRequest) => Promise<RealBody> & {
    abort: () => void;
  };
};
// @ts-expect-error the OpenSearch client resolves with the transport result, whose answer is under body.
expectTypeOf<BodyOnlyClient>().toExtend<OpenSearchSearchClient>();

// A search that cannot be aborted cannot be cancelled on the wire.
type PlainPromiseClient = {
  search: (
    request: OpenSearchSearchRequest,
  ) => Promise<{ body: ElasticSearchResponseBody }>;
};
// @ts-expect-error without abort() on the promise a search returns, the adapter could not stop the request.
expectTypeOf<PlainPromiseClient>().toExtend<OpenSearchSearchClient>();

// A page size is a number, so a stringly typed one cannot reach the wire.
type StringPageSize = { body: { size: string } };
// @ts-expect-error size is a number in OpenSearch.
expectTypeOf<StringPageSize>().toExtend<API.Search_Request>();
