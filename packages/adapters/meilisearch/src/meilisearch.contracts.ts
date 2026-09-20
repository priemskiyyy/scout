import type {
  ExtraRequestInit,
  Hit,
  Index,
  RecordAny,
  SearchParams,
  SearchResponse,
} from "meilisearch";
import { expectTypeOf } from "vitest";
import { meilisearch } from "src/meilisearch";
import type { MeilisearchIndexClient } from "src/types/MeilisearchIndexClient";
import type { MeilisearchSearchHit } from "src/types/MeilisearchSearchHit";
import type { MeilisearchSearchOptions } from "src/types/MeilisearchSearchOptions";
import type { MeilisearchSearchParams } from "src/types/MeilisearchSearchParams";
import type { MeilisearchSearchResponse } from "src/types/MeilisearchSearchResponse";

// The only file in this package that names the SDK. It pins the structural
// types the adapter is written against to meilisearch 0.62.0, so an SDK change
// fails here rather than at a consumer's call site.

/** A real index client can be injected as the adapter's client. */
expectTypeOf<Index<RecordAny>>().toExtend<MeilisearchIndexClient>();

/** Everything the adapter sends is a legal Meilisearch search parameter. */
expectTypeOf<MeilisearchSearchParams>().toExtend<SearchParams>();

/** So is everything a profile or a `.provider()` call may add. */
expectTypeOf<MeilisearchSearchOptions>().toExtend<SearchParams>();

/** Page mode answers with the exhaustive pagination block the adapter reads. */
expectTypeOf<
  SearchResponse<RecordAny, { page: number; hitsPerPage: number }>
>().toExtend<MeilisearchSearchResponse>();

/** Offset mode answers with the estimated block, and is read just as well. */
expectTypeOf<
  SearchResponse<RecordAny, { offset: number; limit: number }>
>().toExtend<MeilisearchSearchResponse>();

/** A real hit, `_formatted` included, is the hit type the adapter translates. */
expectTypeOf<Hit<RecordAny>>().toExtend<MeilisearchSearchHit>();

/**
 * `ExtraRequestInit` is `Omit<RequestInit, "body" | "method">`, so `signal`
 * survives into the third argument. That is what makes this adapter's
 * `cancellation: "transport"` true rather than aspirational.
 */
expectTypeOf<ExtraRequestInit>().toExtend<{ signal?: AbortSignal | null }>();

const acceptParams = (params: MeilisearchSearchParams) => params;
const acceptOptions = (options: MeilisearchSearchOptions) => options;

acceptParams({
  // @ts-expect-error The query travels in the first argument of search, so q is not a parameter the adapter builds.
  q: "shoe",
});

acceptParams({
  // @ts-expect-error A page size is a number, and Meilisearch rejects the string form.
  hitsPerPage: "10",
});

acceptParams({
  // @ts-expect-error Meilisearch matches with all, last or frequency, and nothing else.
  matchingStrategy: "best",
});

acceptOptions({
  // @ts-expect-error filter is a Scout owned key, so it is not reachable through a profile or a provider option.
  filter: 'brand = "Apex"',
});

expectTypeOf<
  SearchResponse<RecordAny, { offset: number; limit: number }>
>().toHaveProperty(
  // @ts-expect-error Offset pagination reports estimatedTotalHits and never the exhaustive totalHits.
  "totalHits",
);

const adapter = meilisearch({
  index: { uid: "products", search: () => Promise.resolve({ hits: [] }) },
  profiles: { default: {} },
  sorts: { relevance: {} },
});

/** The configured names survive, so an index can require coverage of them. */
expectTypeOf(adapter).toExtend<{
  profiles: Readonly<Record<"default", unknown>>;
  sorts: Readonly<Record<"relevance", unknown>>;
}>();

// @ts-expect-error This adapter was given no sort named cheapest, so an index that declares one cannot take it.
expectTypeOf(adapter).toExtend<{
  sorts: Readonly<Record<"cheapest", unknown>>;
}>();
