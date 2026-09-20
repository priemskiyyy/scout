import type {
  AdapterSearchRequest,
  AdapterSearchResponse,
} from "@priemskiyyy/scout";
import type { HttpFetch } from "src/types/HttpFetch";
import type { HttpHeaders } from "src/types/HttpHeaders";
import type { HttpMethod } from "src/types/HttpMethod";
import type { HttpCapabilities } from "src/types/HttpCapabilities";
import type { HttpRequestBody } from "src/types/HttpRequestBody";

/**
 * Configures an HTTP endpoint and the request and response mappings it uses.
 *
 * @example
 * ```ts
 * const options: HttpAdapterOptions<"default", "relevance"> = {
 *   endpoint: "/api/search", capabilities, profiles: { default: null },
 *   sorts: { relevance: null }, toRequest: scoutWireRequest, fromResponse: scoutWireResponse,
 * };
 * ```
 * @see [http adapter](https://priemskiyyy.github.io/scout/adapters.html#http-your-own-endpoint)
 */
export type HttpAdapterOptions<
  TProfile extends string = string,
  TSort extends string = string,
  TNativeOptions = never,
  TNativeHit = unknown,
  TNativeResponse = unknown,
> = {
  /**
   * The URL to search, or a function that builds one per request when the
   * index name or the profile picks a different route. A function endpoint
   * makes `fingerprint` required, because there is no single URL left to
   * derive an identity from.
   */
  endpoint:
    string | ((request: AdapterSearchRequest<TNativeOptions>) => string);
  /**
   * The fetch to call. Defaults to `globalThis.fetch`, and is injected so a
   * runtime without one, an instrumented client or a test can supply its own.
   * When neither is available the adapter throws at construction rather than
   * at the first search.
   */
  fetch?: HttpFetch;
  /**
   * Static headers, or a function called once per request so a token that was
   * refreshed since the adapter was created is the one that travels. It may
   * return a promise, which is what reading a token from async storage needs.
   */
  headers?: HttpHeaders | (() => HttpHeaders | Promise<HttpHeaders>);
  /** Defaults to `"POST"`. */
  method?: HttpMethod;
  /** What the backend can do. Required, because only the application knows. */
  capabilities: HttpCapabilities;
  /**
   * Every sort name the index declares. The value is yours; the adapter reads
   * only the names, because what a sort becomes on the wire is `toRequest`'s
   * business. `null` is the convention for a name that needs no value.
   */
  sorts: Readonly<Record<TSort, unknown>>;
  /** Every profile name the index declares, on the same terms as `sorts`. */
  profiles: Readonly<Record<TProfile, unknown>>;
  /**
   * Builds the JSON your backend expects from Scout's request. This is the
   * half of the protocol only you know, which is why the package does not
   * guess it. `scoutWireRequest` is a ready made one for a backend you own.
   */
  toRequest: (request: AdapterSearchRequest<TNativeOptions>) => HttpRequestBody;
  /**
   * Parses the unknown JSON body into the response contract. Validate it with
   * your schema or narrow it before reading fields. Documents are also checked
   * against the index schema. `scoutWireResponse` parses the bundled format.
   */
  fromResponse: (
    body: unknown,
    request: AdapterSearchRequest<TNativeOptions>,
  ) => AdapterSearchResponse<TNativeHit, TNativeResponse>;
  /**
   * What identifies the target in the query identity. Defaults to the endpoint
   * with any userinfo and query string removed, which is where a credential
   * travels in a URL, because a fingerprint reaches cache keys, devtools and
   * logs.
   */
  fingerprint?: () => string;
  /**
   * Provider option keys that would collide with something your `toRequest`
   * owns. Defaults to `[]`, because this adapter reserves no key of its own.
   */
  reservedOptions?: readonly string[];
};
