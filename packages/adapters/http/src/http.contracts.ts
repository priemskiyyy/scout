import type { AdapterSearchRequest } from "@priemskiyyy/scout";
import { expectTypeOf } from "vitest";
import { http } from "src/http";
import type { HttpCapabilities } from "src/types/HttpCapabilities";
import type { HttpFetch } from "src/types/HttpFetch";
import type { HttpFetchInit } from "src/types/HttpFetchInit";
import type { HttpFetchResponse } from "src/types/HttpFetchResponse";
import type { HttpRequestBody } from "src/types/HttpRequestBody";
import { scoutWireRequest } from "src/scoutWireRequest";
import { scoutWireResponse } from "src/scoutWireResponse";
import type { ScoutWireRequest } from "src/types/ScoutWireRequest";

// This is the one adapter with no SDK to pin, because its provider is the
// platform. So this file pins the platform instead: the structural fetch types
// in `src/http.ts` against the runtime's own declarations, which is what makes
// "pass your own fetch" and "the default is the global one" the same contract.

const ENDPOINT = "https://api.test/search";

const CAPABILITIES: HttpCapabilities = {
  filters: {
    eq: true,
    neq: true,
    in: false,
    notIn: false,
    comparison: true,
    between: false,
    booleanComposition: true,
  },
  pagination: { maxPageSize: 100 },
  facets: { resultScoped: true },
  highlights: "none",
};

/** The runtime's own fetch can be injected, which is why it is the default. */
expectTypeOf<typeof globalThis.fetch>().toExtend<HttpFetch>();

/** Everything this adapter sends is a legal fetch init. */
expectTypeOf<HttpFetchInit>().toExtend<RequestInit>();

/** Everything it reads is on a real response. */
expectTypeOf<Response>().toExtend<HttpFetchResponse>();

/**
 * `signal` is not optional here, so a fetch is always handed one. That is what
 * makes the default `cancellation: "transport"` true rather than aspirational.
 */
expectTypeOf<HttpFetchInit>()
  .toHaveProperty("signal")
  .toEqualTypeOf<AbortSignal>();

/** The shipped wire request is a legal body for both methods. */
expectTypeOf<ScoutWireRequest>().toExtend<HttpRequestBody>();

const acceptFetch = (call: HttpFetch) => call;

acceptFetch(
  // @ts-expect-error A fetch has to answer with something this adapter can read the status and the text off, not with the text itself.
  async (): Promise<string> => "{}",
);

const acceptCapabilities = (capabilities: HttpCapabilities) => capabilities;

acceptCapabilities({
  ...CAPABILITIES,
  // @ts-expect-error Highlights are parts or nothing; Scout never returns markup, so there is no third answer to declare.
  highlights: "markup",
});

acceptCapabilities({
  ...CAPABILITIES,
  // @ts-expect-error Cancellation is transport or logical, and the default this package applies is one of those two.
  cancellation: "maybe",
});

// An index declares the names its application uses and the adapter has to
// cover every one of them. `SearchAdapter` widens its records, so the names
// have to survive on the returned type for that constraint to mean anything,
// and they only do when the value is built the way a real one is.
const adapter = http({
  endpoint: ENDPOINT,
  capabilities: CAPABILITIES,
  sorts: { relevance: null, cheapest: null },
  profiles: { default: null },
  toRequest: scoutWireRequest,
  fromResponse: scoutWireResponse,
});

const covered: Readonly<Record<"relevance" | "cheapest", unknown>> =
  adapter.sorts;
expectTypeOf(covered).toExtend<Readonly<Record<"cheapest", unknown>>>();

// @ts-expect-error An index declaring a sort this adapter was not configured with fails here, which is where a provider swap is supposed to fail rather than at a consumer call site.
const uncovered: Readonly<Record<"newest", unknown>> = adapter.sorts;
expectTypeOf(uncovered).toExtend<Readonly<Record<"newest", unknown>>>();

// @ts-expect-error The same holds for a profile the configuration does not name.
const uncoveredProfile: Readonly<Record<"autocomplete", unknown>> =
  adapter.profiles;
expectTypeOf(uncoveredProfile).toExtend<
  Readonly<Record<"autocomplete", unknown>>
>();

// @ts-expect-error Only the application knows what its backend can do, so capabilities has no default and cannot be left out.
http({
  endpoint: ENDPOINT,
  sorts: { relevance: null },
  profiles: { default: null },
  toRequest: scoutWireRequest,
  fromResponse: scoutWireResponse,
});

http({
  endpoint: ENDPOINT,
  capabilities: CAPABILITIES,
  // @ts-expect-error A search endpoint takes a POST or a GET; anything else would need a body encoding this package does not own.
  method: "PUT",
  sorts: { relevance: null },
  profiles: { default: null },
  toRequest: scoutWireRequest,
  fromResponse: scoutWireResponse,
});

http({
  endpoint: ENDPOINT,
  capabilities: CAPABILITIES,
  sorts: { relevance: null },
  profiles: { default: null },
  // @ts-expect-error A request body is a JSON object, because a GET has to turn it into query parameters.
  toRequest: () => "query=shoe",
  fromResponse: scoutWireResponse,
});

http({
  endpoint: ENDPOINT,
  capabilities: CAPABILITIES,
  sorts: { relevance: null },
  profiles: { default: null },
  toRequest: scoutWireRequest,
  fromResponse: (body, request) => ({
    hits: [],
    page: {
      kind: "page",
      current: request.page.current,
      size: request.page.size,
      next: null,
      previous: null,
    },
    // @ts-expect-error A mapper cannot invent a fifth total accuracy.
    total: { value: 0, accuracy: "counted", scope: "matches" },
    facets: {},
    took: null,
    native: body,
  }),
});

// Native options are the application's own, and they reach `toRequest` typed.
const routed = http({
  endpoint: (request: AdapterSearchRequest<{ routing: string }>) =>
    `${ENDPOINT}/${request.index}`,
  fingerprint: () => ENDPOINT,
  capabilities: CAPABILITIES,
  sorts: { relevance: null },
  profiles: { default: null },
  reservedOptions: ["routing"],
  toRequest: (request) => ({
    ...scoutWireRequest(request),
    routing: request.provider?.routing ?? null,
  }),
  fromResponse: scoutWireResponse,
});

expectTypeOf(routed.search)
  .parameter(0)
  .toExtend<AdapterSearchRequest<{ routing: string }>>();

http({
  endpoint: ENDPOINT,
  capabilities: CAPABILITIES,
  sorts: { relevance: null },
  profiles: { default: null },
  toRequest: scoutWireRequest,
  // @ts-expect-error Untrusted JSON must be narrowed by the response mapper.
  fromResponse: (body: { trusted: true }, request) => ({
    ...scoutWireResponse(body, request),
    native: body,
  }),
});
