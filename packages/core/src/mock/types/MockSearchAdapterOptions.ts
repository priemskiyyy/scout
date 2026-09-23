import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import type { MockSearchResponse } from "src/mock/types/MockSearchResponse";

/**
 * Configures the mock's answers and its deliberate misbehavior.
 *
 * @example
 * ```ts
 * const options: MockSearchAdapterOptions = { hold: true, ignoreSignal: true };
 * ```
 *
 * @see [Testing an adapter](https://priemskiyyy.github.io/scout/writing-an-adapter.html)
 */
export type MockSearchAdapterOptions = {
  /** Hold every answer until a test settles it, so order is the test's choice. */
  hold?: boolean;
  /** Keep running after abort, the way an SDK with no cancellation does. */
  ignoreSignal?: boolean;
  /** The answer when the mock is not holding. It may throw, to refuse. */
  response?: (request: AdapterSearchRequest<unknown>) => MockSearchResponse;
  /** What the adapter's fingerprint says. Defaults to "mock". */
  fingerprint?: string;
  /** Sorts the adapter serves through configuration of its own. */
  sorts?: Readonly<Record<string, unknown>>;
  /** Engine tuning keyed by profile name. */
  profiles?: Readonly<Record<string, unknown>>;
  /** Provider options the mock says it writes itself. */
  reservedOptions?: readonly string[];
};
