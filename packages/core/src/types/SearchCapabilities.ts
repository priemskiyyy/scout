/**
 * Declares the portable behaviour an adapter implements. Unsupported requests
 * throw `UnsupportedSearchFeatureError` before dispatch.
 *
 * Transport cancellation stops the provider request. Logical cancellation
 * stops Scout waiting, but the provider may continue processing and billing.
 *
 * @example
 * ```ts
 * const capabilities: SearchCapabilities = {
 *   filters: { eq: true, neq: true, in: true, notIn: true, comparison: true,
 *     between: true, booleanComposition: true },
 *   pagination: { maxPageSize: 100 }, facets: { resultScoped: false },
 *   highlights: "none", cancellation: "transport",
 * };
 * ```
 *
 * @see [SearchAdapter usage](https://priemskiyyy.github.io/scout/adapters.html)
 */
export type SearchCapabilities = {
  filters: {
    eq: boolean;
    neq: boolean;
    in: boolean;
    notIn: boolean;
    /** `gt`, `gte`, `lt` and `lte`. */
    comparison: boolean;
    between: boolean;
    /** `and`, `or` and `not`. */
    booleanComposition: boolean;
  };
  pagination: {
    /** The largest accepted page size, or null when the engine has no known limit. */
    maxPageSize: number | null;
  };
  facets: {
    /** Facet counts for the current result set. */
    resultScoped: boolean;
  };
  highlights: "none" | "parts";
  cancellation: "logical" | "transport";
};
