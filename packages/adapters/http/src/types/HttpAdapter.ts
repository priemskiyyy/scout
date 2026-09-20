import type { SearchAdapter } from "@priemskiyyy/scout";
import type { HttpFetch } from "src/types/HttpFetch";

/**
 * An HTTP adapter that retains its configured sort and profile names.
 * The native response is null when a match-none filter skips the backend.
 *
 * @example
 * ```ts
 * const adapter: HttpAdapter<"default", "relevance"> = http(options);
 * ```
 * @see [http adapter](https://priemskiyyy.github.io/scout/adapters.html#http-your-own-endpoint)
 */
export type HttpAdapter<
  TProfile extends string = string,
  TSort extends string = string,
  TNativeOptions = never,
  TNativeHit = unknown,
  TNativeResponse = unknown,
> = SearchAdapter<
  HttpFetch,
  TNativeOptions,
  TNativeHit,
  TNativeResponse | null
> & {
  profiles: Readonly<Record<TProfile, unknown>>;
  sorts: Readonly<Record<TSort, unknown>>;
};
