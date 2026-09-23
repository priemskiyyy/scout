import type { HttpRequest } from "src/types/HttpRequest";
import type { ScoutWireRefusal } from "src/types/ScoutWireRefusal";
import type { ScoutWireResponse } from "src/types/ScoutWireResponse";

/**
 * Options for `http()`. Your own client owns the transport and the answer: the
 * address, authentication, headers, retries, status handling, and the shape of
 * what it resolves with.
 *
 * @example
 * ```ts
 * http({
 *   fingerprint: "catalogue-api",
 *   request: ({ search, signal }) => api.search(search, { signal }),
 * });
 * ```
 * @see [http adapter](https://priemskiyyy.github.io/scout/adapters.html#http-your-own-endpoint)
 */
export type HttpAdapterOptions<TNativeOptions = never> = {
  /**
   * Names your backend in every query key, so two backends never share a
   * cached answer. Never a credential: it reaches cache keys, devtools and
   * logs.
   */
  fingerprint: string;
  /**
   * Sends one search and resolves with the backend's answer in the wire
   * format. Pass `signal` on, and throw when the backend did not answer with
   * a search, such as on a failed status. When the backend is not yours to
   * trust, validate its body here with your schema library.
   */
  request: (
    request: HttpRequest<TNativeOptions>,
  ) => Promise<ScoutWireResponse | ScoutWireRefusal>;
};
