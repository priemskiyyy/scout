import type { SearchCapabilities } from "@priemskiyyy/scout";

/**
 * The backend's capabilities, declared by the application. Cancellation
 * defaults to `"transport"` because fetch supports aborting the connection;
 * use `"logical"` when the backend continues processing after disconnect.
 *
 * @example
 * ```ts
 * const capabilities: HttpCapabilities = {
 *   filters: { eq: true, neq: true, in: true, notIn: true, comparison: true,
 *     between: true, booleanComposition: true },
 *   pagination: { maxPageSize: 100 }, facets: { resultScoped: false }, highlights: "none",
 * };
 * ```
 * @see [http adapter](https://priemskiyyy.github.io/scout/adapters.html#http-your-own-endpoint)
 */
export type HttpCapabilities = Omit<SearchCapabilities, "cancellation"> & {
  cancellation?: SearchCapabilities["cancellation"];
};
