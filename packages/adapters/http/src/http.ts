import { requestFor } from "src/utils/requestFor";
import type { HttpHeaders } from "src/types/HttpHeaders";
import type { HttpFetchResponse } from "src/types/HttpFetchResponse";

import type { HttpFetch } from "src/types/HttpFetch";

import type { HttpAdapterOptions } from "src/types/HttpAdapterOptions";
import type { HttpAdapter } from "src/types/HttpAdapter";
import {
  emptySearchResponse,
  createSearchAdapter,
  SearchConfigurationError,
  SearchProviderError,
} from "@priemskiyyy/scout";
import type {
  AdapterSearchRequest,
  AdapterSearchResponse,
} from "@priemskiyyy/scout";

const ADAPTER_NAME = "http";

/**
 * How much of a refused response's body travels in the error message. Enough
 * to recognise the failure, short enough that a log line stays a log line.
 */
const BODY_SNIPPET = 200;

const resolveFetch = (injected: HttpFetch | undefined): HttpFetch => {
  if (typeof injected === "function") {
    return injected;
  }
  const global = globalThis.fetch;
  if (typeof global !== "function") {
    throw new SearchConfigurationError({
      path: "fetch",
      message:
        `The ${ADAPTER_NAME} adapter found no fetch to call. This runtime ` +
        `has no global one, so pass fetch with the implementation to use.`,
    });
  }
  return global;
};

/**
 * Names the target without carrying a credential. A fingerprint takes part in
 * the query identity, so it reaches cache keys, devtools and logs, and both
 * the userinfo and the query string of a URL are where an API key travels.
 * `origin` is the scheme, host and port with any `user:password@` left out,
 * and the pathname names the search route, which is all that identifies it.
 */
const identifyEndpoint = (endpoint: string): string => {
  try {
    const url = new URL(endpoint);
    return `${url.origin}${url.pathname}`;
  } catch {
    // A relative endpoint has no origin and therefore no userinfo, so only the
    // query string has to go.
    return endpoint.split("?")[0] ?? endpoint;
  }
};

const resolveFingerprint = (
  endpoint: unknown,
  fingerprint: (() => string) | undefined,
): (() => string) => {
  if (typeof fingerprint === "function") {
    return fingerprint;
  }
  if (typeof endpoint !== "string") {
    throw new SearchConfigurationError({
      path: "fingerprint",
      message:
        `The ${ADAPTER_NAME} adapter cannot derive a fingerprint from an ` +
        `endpoint it computes per request. Pass fingerprint with something ` +
        `that names the backend and holds no credential.`,
    });
  }
  const identity = identifyEndpoint(endpoint);
  return () => identity;
};

const resolveHeaders = async (
  headers: HttpHeaders | (() => HttpHeaders | Promise<HttpHeaders>) | undefined,
): Promise<HttpHeaders> => {
  if (typeof headers === "function") {
    return await headers();
  }
  return headers ?? {};
};

/**
 * The status and a slice of the body, which is where a backend says what was
 * wrong. The request headers are never here, and neither is the URL, because
 * both carry credentials and this message reaches logs.
 */
const refusalOf = async (
  response: HttpFetchResponse,
  index: string,
): Promise<SearchProviderError> => {
  const body = await response.text().catch(() => "");
  const snippet =
    body.length > BODY_SNIPPET ? `${body.slice(0, BODY_SNIPPET)}...` : body;
  return new SearchProviderError({
    adapter: ADAPTER_NAME,
    message:
      `The ${ADAPTER_NAME} search of ${index} was refused with status ` +
      `${response.status}${snippet === "" ? "." : `: ${snippet}`}`,
    cause: null,
  });
};

/**
 * JSON is untrusted until the response mapper parses it. A type annotation
 * on the mapper cannot make an unchecked network response safe.
 */
const decodeBody = (text: string, index: string): unknown => {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new SearchProviderError({
      adapter: ADAPTER_NAME,
      message:
        `The ${ADAPTER_NAME} search of ${index} answered with a body that is ` +
        `not JSON.`,
      cause: error,
    });
  }
};

/**
 * Puts a JSON search endpoint behind the Scout contract.
 *
 * It owns the plumbing every HTTP backend needs and none of the semantics only
 * the backend knows. The signal goes into fetch, a refused response becomes a
 * `SearchProviderError` carrying the status and a slice of the body, a body
 * that is not JSON says so instead of surfacing a `SyntaxError`, a filter that
 * matches nothing is answered without a request, and the fingerprint names the
 * endpoint with any credential stripped out of it.
 *
 * What the request body and the response JSON look like is yours, through
 * `toRequest` and `fromResponse`, because inventing a protocol on your
 * backend's behalf is the one thing a generic HTTP adapter must not do. If you
 * own both ends, `scoutWireRequest` and `scoutWireResponse` are a documented
 * pair you can pass straight in.
 *
 * @example
 * ```ts
 * const adapter = http({
 *   endpoint: "https://api.example.com/search",
 *   headers: async () => ({ authorization: `Bearer ${await token()}` }),
 *   capabilities: {
 *     filters: { eq: true, neq: true, in: true, notIn: false, comparison: true, between: false, booleanComposition: true },
 *     pagination: { maxPageSize: 100 },
 *     facets: { resultScoped: true },
 *     highlights: "none",
 *   },
 *   sorts: { relevance: null, cheapest: null },
 *   profiles: { default: null },
 *   toRequest: scoutWireRequest,
 *   fromResponse: scoutWireResponse,
 * });
 * ```
 */
export const http = <
  TProfile extends string = string,
  TSort extends string = string,
  TNativeOptions = never,
  TNativeHit = unknown,
  TNativeResponse = unknown,
>(
  options: HttpAdapterOptions<
    TProfile,
    TSort,
    TNativeOptions,
    TNativeHit,
    TNativeResponse
  >,
): HttpAdapter<
  TProfile,
  TSort,
  TNativeOptions,
  TNativeHit,
  TNativeResponse
> => {
  // Both of these fail at construction rather than at the first search, so a
  // runtime without fetch and an endpoint with no derivable identity are
  // configuration mistakes and arrive as ones.
  const call = resolveFetch(options.fetch);
  const fingerprint = resolveFingerprint(options.endpoint, options.fingerprint);
  const method = options.method ?? "POST";

  const adapter = createSearchAdapter({
    name: ADAPTER_NAME,
    native: call,
    capabilities: {
      ...options.capabilities,
      cancellation: options.capabilities.cancellation ?? "transport",
    },
    sorts: options.sorts,
    profiles: options.profiles,
    reservedOptions: options.reservedOptions ?? [],
    fingerprint,
    search: async (
      request: AdapterSearchRequest<TNativeOptions>,
      { signal },
    ): Promise<AdapterSearchResponse<TNativeHit, TNativeResponse | null>> => {
      if (
        request.filter.type === "constant" &&
        request.filter.value === false
      ) {
        return emptySearchResponse(request);
      }
      const endpoint =
        typeof options.endpoint === "function"
          ? options.endpoint(request)
          : options.endpoint;
      const headers = await resolveHeaders(options.headers);
      const { url, init } = requestFor(
        method,
        endpoint,
        options.toRequest(request),
        headers,
        signal,
      );

      const response = await call(url, init);
      if (!response.ok) {
        throw await refusalOf(response, request.index);
      }
      return options.fromResponse(
        decodeBody(await response.text(), request.index),
        request,
      );
    },
  });
  return adapter;
};
