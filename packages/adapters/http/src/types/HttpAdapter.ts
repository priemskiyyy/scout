import type { SearchAdapter } from "@priemskiyyy/scout";

import type { HttpAdapterOptions } from "src/types/HttpAdapterOptions";
import type { ScoutWireHit } from "src/types/ScoutWireHit";
import type { ScoutWireResponse } from "src/types/ScoutWireResponse";

/**
 * The adapter this package builds. Its native handle is the `request` you
 * passed, and each hit and the whole answer are kept as the backend gave
 * them.
 *
 * @example
 * ```ts
 * const adapter: HttpAdapter = http({ fingerprint: "catalogue-api", request });
 * ```
 * @see [http adapter](https://priemskiyyy.github.io/scout/adapters.html#http-your-own-endpoint)
 */
export type HttpAdapter<TNativeOptions = never> = SearchAdapter<
  HttpAdapterOptions<TNativeOptions>["request"],
  TNativeOptions,
  ScoutWireHit,
  ScoutWireResponse
>;
