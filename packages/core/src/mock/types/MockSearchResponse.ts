import type { AdapterSearchResponse } from "src/types/AdapterSearchResponse";

/**
 * An adapter response used to settle a recorded mock request.
 *
 * @example
 * ```ts
 * const response: MockSearchResponse = emptySearchResponse(request);
 * ```
 *
 * @see [Adapter testing](https://priemskiyyy.github.io/scout/writing-an-adapter.html)
 */
export type MockSearchResponse = AdapterSearchResponse<unknown, unknown>;
