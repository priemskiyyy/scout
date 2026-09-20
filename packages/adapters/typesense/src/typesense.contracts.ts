import type { Client, SearchClient } from "typesense";
import type {
  SearchOptions,
  SearchParams,
  SearchResponse,
  SearchResponseFacetCountSchema,
  SearchResponseHit,
} from "typesense/lib/Typesense/Documents";
import { expectTypeOf } from "vitest";
import type { TypesenseFacetCounts } from "src/types/TypesenseFacetCounts";
import type { TypesenseHighlight } from "src/types/TypesenseHighlight";
import type { TypesenseHit } from "src/types/TypesenseHit";
import type { TypesenseSearchClient } from "src/types/TypesenseSearchClient";
import type { TypesenseSearchParameters } from "src/types/TypesenseSearchParameters";
import type { TypesenseSearchResponse } from "src/types/TypesenseSearchResponse";
import type {
  TypesenseFakeFacetCount,
  TypesenseFakeHighlight,
  TypesenseFakeHit,
  TypesenseFakeProduct,
  TypesenseFakeResponse,
} from "src/typesense.fixture";

/**
 * Pins the structural client, the structural response and the fake that stands
 * in for them to the real `typesense` 3.0.6 types.
 *
 * The adapter imports no SDK, so nothing else would notice if Typesense renamed
 * a parameter, changed a value's type or stopped sending a field. This file is
 * the only place the two shapes meet, and it is type level only: it compiles,
 * it never runs.
 */

type RealParams = SearchParams<TypesenseFakeProduct>;
type RealResponse = SearchResponse<TypesenseFakeProduct>;
type RealHit = SearchResponseHit<TypesenseFakeProduct>;
type RealFacetCounts = SearchResponseFacetCountSchema<TypesenseFakeProduct>;
type RealHighlight = NonNullable<RealHit["highlights"]>[number];

// An application injects the client it already has, so both of the SDK's
// clients have to satisfy the structural type without being annotated.
expectTypeOf<Client>().toExtend<TypesenseSearchClient>();
expectTypeOf<SearchClient>().toExtend<TypesenseSearchClient>();

// Every parameter the adapter can write is a parameter Typesense accepts, so a
// renamed or mistyped one is a compile error here rather than a silently
// ignored query parameter on the wire.
expectTypeOf<TypesenseSearchParameters>().toExtend<RealParams>();

// A real response is readable through the structural type the adapter maps.
expectTypeOf<RealResponse>().toExtend<TypesenseSearchResponse>();
expectTypeOf<RealHit>().toExtend<TypesenseHit>();
expectTypeOf<RealFacetCounts>().toExtend<TypesenseFacetCounts>();
expectTypeOf<RealHighlight>().toExtend<TypesenseHighlight>();

// `abortSignal` is why this adapter declares `cancellation: "transport"`.
expectTypeOf<SearchOptions["abortSignal"]>().toExtend<
  AbortSignal | null | undefined
>();

// The fake answers with shapes the real SDK could have produced. Both hit
// carrying fields are left out for the reason the negative case below states.
expectTypeOf<Omit<TypesenseFakeResponse, "hits" | "grouped_hits">>().toExtend<
  Omit<RealResponse, "hits" | "grouped_hits">
>();
expectTypeOf<Omit<TypesenseFakeHit, "highlights">>().toExtend<
  Omit<RealHit, "highlights">
>();
expectTypeOf<TypesenseFakeHighlight>().toExtend<RealHighlight>();
expectTypeOf<TypesenseFakeFacetCount>().toExtend<RealFacetCounts>();

// The two `Omit`s above are not tidiness. `highlights` is typed as a one
// element tuple in typesense 3.0.6, although the server returns one entry per
// highlighted field, so a faithful hit cannot satisfy the SDK's own type.
// @ts-expect-error `highlights` is a one element tuple in typesense 3.0.6, so a hit that highlights two fields is rejected by the SDK's type.
expectTypeOf<TypesenseFakeHit>().toExtend<RealHit>();

// The structural response carries only what the adapter reads, so it is never a
// stand-in for the SDK's: a response also has `out_of` and `request_params`.
// @ts-expect-error the structural response is a subset of the SDK's, which also requires out_of, search_time_ms and request_params.
expectTypeOf<TypesenseSearchResponse>().toExtend<RealResponse>();

// A facet value arrives as a string even for a numeric field, which is the
// whole reason the adapter takes a coercion hint per field.
// @ts-expect-error a Typesense facet value is a string on the wire even when the field is numeric.
expectTypeOf<RealFacetCounts["counts"][number]["value"]>().toExtend<number>();

// Typesense marks a match by wrapping it, so there are no offsets to read and
// the adapter has to parse the markers instead.
// @ts-expect-error a Typesense highlight carries marker wrapped text, not a start and end offset.
expectTypeOf<RealHighlight>().toExtend<{ start: number; end: number }>();

// A page size is a number, so a stringly typed one cannot reach the wire. The
// aliases below keep each negative case on one line, because the directive
// suppresses only the line after it and a wrapped call reports further down.
type StringPageSize = { per_page: string };
// @ts-expect-error per_page is a number in Typesense.
expectTypeOf<StringPageSize>().toExtend<RealParams>();

// A client that cannot name a collection is not a client this adapter can use.
type CollectionListOnly = { collections: () => unknown };
// @ts-expect-error collections() with no collection name answers with the collection list, which has no documents handle.
expectTypeOf<CollectionListOnly>().toExtend<TypesenseSearchClient>();
