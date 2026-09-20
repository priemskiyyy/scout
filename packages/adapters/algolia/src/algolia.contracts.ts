import type { Algoliasearch } from "algoliasearch";
import { expectTypeOf } from "vitest";
import type { AlgoliaExhaustive } from "src/types/AlgoliaExhaustive";
import type { AlgoliaHit } from "src/types/AlgoliaHit";
import type { AlgoliaRequestOptions } from "src/types/AlgoliaRequestOptions";
import type { AlgoliaSearchClient } from "src/types/AlgoliaSearchClient";
import type { AlgoliaSearchParams } from "src/types/AlgoliaSearchParams";
import type { AlgoliaSearchResponse } from "src/types/AlgoliaSearchResponse";
import { createAlgoliaFake } from "src/algolia.fixture";

// Everything is derived from the client type rather than imported from
// `@algolia/client-search`, because that package is only a transitive
// dependency of `algoliasearch` and this package declares no dependency on it.
type RealProps = Parameters<Algoliasearch["searchSingleIndex"]>[0];
type RealParams = NonNullable<RealProps["searchParams"]>;
type RealRequestOptions = NonNullable<
  Parameters<Algoliasearch["searchSingleIndex"]>[1]
>;
type RealResponse = Awaited<ReturnType<Algoliasearch["searchSingleIndex"]>>;
type RealHttpResponse = Awaited<
  ReturnType<Algoliasearch["searchSingleIndexWithHTTPInfo"]>
>;
type RealHit = RealResponse["hits"][number];

// The injected client and the fake answer to the same structural type.
expectTypeOf<Algoliasearch>().toExtend<AlgoliaSearchClient>();
expectTypeOf(createAlgoliaFake().client).toExtend<AlgoliaSearchClient>();

// The real payloads fit the shapes the adapter reads.
expectTypeOf<RealProps>().toExtend<{ indexName: string }>();
expectTypeOf<RealParams>().toExtend<AlgoliaSearchParams>();
expectTypeOf<AlgoliaSearchParams>().toExtend<RealParams>();
expectTypeOf<RealRequestOptions>().toExtend<AlgoliaRequestOptions>();
expectTypeOf<RealResponse>().toExtend<AlgoliaSearchResponse>();
expectTypeOf<RealHttpResponse>().toExtend<{ data: AlgoliaSearchResponse }>();
expectTypeOf<RealHit>().toExtend<AlgoliaHit>();
expectTypeOf<
  NonNullable<RealResponse["exhaustive"]>
>().toExtend<AlgoliaExhaustive>();

// Every count Algolia reports is optional, which is why the adapter has an
// `"unknown"` branch for each of them instead of a default.
expectTypeOf<RealResponse["nbHits"]>().toEqualTypeOf<number | undefined>();
expectTypeOf<RealResponse["page"]>().toEqualTypeOf<number | undefined>();
expectTypeOf<RealResponse["nbPages"]>().toEqualTypeOf<number | undefined>();
expectTypeOf<NonNullable<RealResponse["exhaustive"]>["nbHits"]>().toEqualTypeOf<
  boolean | undefined
>();

const takesRequestOptions = (options: RealRequestOptions) => options;
const takesSearchParams = (params: RealParams) => params;
const takesExhaustive = (exhaustive: NonNullable<RealResponse["exhaustive"]>) =>
  exhaustive;
const takesNumber = (value: number) => value;
const takesString = (value: string) => value;
const takesClient = (client: AlgoliaSearchClient) => client;

declare const response: RealResponse;
declare const hit: RealHit;
declare const withoutHttpInfo: Pick<AlgoliaSearchClient, "searchSingleIndex">;

// @ts-expect-error There is no AbortSignal anywhere in @algolia/client-common 5.59.0, so a request cannot carry a signal and the adapter declares cancellation "logical".
takesRequestOptions({ signal: new AbortController().signal });

// @ts-expect-error Algolia sorts with replica indexes, so there is no per request sort parameter and a named Scout sort has to resolve to an index name.
takesSearchParams({ sort: ["price:asc"] });

// @ts-expect-error `_highlightResult` holds marked up values under nested keys and arrays, never a plain string, so the adapter walks it instead of reading it.
takesString(hit._highlightResult);

// @ts-expect-error `searchSingleIndexWithHTTPInfo` is required as well, because it is the only search call that bypasses the client's own request and response caches.
takesClient(withoutHttpInfo);

// @ts-expect-error `exhaustive.nbHits` is a flag about how the count was reached, never the count, so it must not be read as a number.
takesExhaustive({ nbHits: 10 });

// @ts-expect-error `nbHits` is optional in Algolia's own typings, so the adapter reports an unknown total rather than assuming a number came back.
takesNumber(response.nbHits);
