import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import type { MockSearchResponse } from "src/mock/types/MockSearchResponse";

/**
 * A recorded search and the controls a test uses to settle or reject it.
 *
 * @example
 * ```ts
 * const recorded: MockSearchRequest | undefined = mock.requests[0];
 * recorded?.fail(new Error("Provider unavailable"));
 * ```
 *
 * @see [Adapter testing](https://priemskiyyy.github.io/scout/writing-an-adapter.html)
 */
export type MockSearchRequest = {
  request: AdapterSearchRequest<Readonly<Record<string, unknown>>>;
  /** Whether the signal for this request was aborted, whatever the mock did. */
  aborted: () => boolean;
  settle: (response: MockSearchResponse) => void;
  fail: (reason: unknown) => void;
};
