import type { HttpFetchInit } from "src/types/HttpFetchInit";
import type { HttpFetchResponse } from "src/types/HttpFetchResponse";

/**
 * The fetch this adapter calls, narrowed to what it uses. `globalThis.fetch`
 * satisfies it, and so does a React Native polyfill, an instrumented client or
 * a test double, without any of them implementing the whole DOM type.
 * `src/http.contracts.ts` pins that against the platform's own declarations.
 *
 * @example
 * ```ts
 * const fetchSearch: HttpFetch = globalThis.fetch;
 * ```
 * @see [http adapter](https://priemskiyyy.github.io/scout/adapters.html#http-your-own-endpoint)
 */
export type HttpFetch = (
  url: string,
  init: HttpFetchInit,
) => Promise<HttpFetchResponse>;
