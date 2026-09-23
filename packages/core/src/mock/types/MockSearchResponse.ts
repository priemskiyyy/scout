import type { AdapterSearchResponse } from "src/types/AdapterSearchResponse";

/**
 * An adapter response used to settle a recorded mock request.
 *
 * @example
 * ```ts
 * const response: MockSearchResponse = { hits: [], facets: {}, took: null, native: null,
 *   total: { value: 0, accuracy: "exact", scope: "matches" } };
 * ```
 *
 * @see [Testing an adapter](https://priemskiyyy.github.io/scout/writing-an-adapter.html)
 */
export type MockSearchResponse = AdapterSearchResponse<unknown, unknown>;
