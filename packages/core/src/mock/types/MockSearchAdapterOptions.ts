import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import type { SearchCapabilities } from "src/types/SearchCapabilities";
import type { MockSearchResponse } from "src/mock/types/MockSearchResponse";

/**
 * Configures declared names, responses and deliberate lifecycle misbehavior for the mock.
 *
 * @example
 * ```ts
 * const options: MockSearchAdapterOptions<"relevance", "default"> = {
 *   sorts: { relevance: null }, profiles: { default: null }, hold: true,
 * };
 * ```
 *
 * @see [Adapter testing](https://priemskiyyy.github.io/scout/writing-an-adapter.html)
 */
export type MockSearchAdapterOptions<
  TSort extends string,
  TProfile extends string,
> = {
  /** Narrows what the adapter claims it can do. */
  capabilities?: Partial<SearchCapabilities>;
  /** Hold every answer until a test settles it, so order is the test's choice. */
  hold?: boolean;
  /** Keep running after abort, the way an SDK with no cancellation does. */
  ignoreSignal?: boolean;
  /** The answer returned when the mock is not holding. */
  response?: (request: AdapterSearchRequest<unknown>) => MockSearchResponse;
  /** Declared as records, the way a real adapter declares them. */
  sorts: Readonly<Record<TSort, unknown>>;
  profiles: Readonly<Record<TProfile, unknown>>;
};
