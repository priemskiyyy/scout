import type { MockSearchResponse } from "src/mock/types/MockSearchResponse";
import type { MockSearchRequest } from "src/mock/types/MockSearchRequest";
import type { MockSearchAdapterOptions } from "src/mock/types/MockSearchAdapterOptions";
import { createSearchAdapter } from "src/generators/createSearchAdapter";
import { emptySearchResponse } from "src/generators/emptySearchResponse";
import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import type { AdapterSearchResponse } from "src/types/AdapterSearchResponse";
import { FULL_CAPABILITIES } from "src/utils/constants/defaultCapabilities";
import { deferred } from "src/utils/internal/deferred";

/**
 * A controllable adapter for lifecycle tests. Records requests and lets tests
 * settle them out of order, ignore cancellation, or return malformed data.
 *
 * @example
 * ```ts
 * const { adapter, requests } = createMockSearchAdapter({
 *   hold: true, sorts: { relevance: null }, profiles: { default: null },
 * });
 * const pending = index.search("a").execute();
 * requests[0]?.settle(response);
 * ```
 */
export const createMockSearchAdapter = <
  const TSort extends string,
  const TProfile extends string,
>(
  options: MockSearchAdapterOptions<TSort, TProfile>,
) => {
  const requests: MockSearchRequest[] = [];
  const build =
    typeof options.response === "function"
      ? options.response
      : emptySearchResponse;

  const adapter = createSearchAdapter({
    name: "mock",
    native: { requests },
    capabilities: { ...FULL_CAPABILITIES, ...options.capabilities },
    sorts: options.sorts,
    profiles: options.profiles,
    reservedOptions: ["filter"],
    fingerprint: () => "mock",
    search: (
      request: AdapterSearchRequest<Readonly<Record<string, unknown>>>,
      { signal },
    ): Promise<AdapterSearchResponse<unknown, unknown>> => {
      const answer = deferred<MockSearchResponse>();
      const record: MockSearchRequest = {
        request,
        aborted: () => signal.aborted,
        settle: answer.resolve,
        fail: answer.reject,
      };
      requests.push(record);

      if (options.ignoreSignal !== true) {
        // A well behaved SDK rejects as soon as the signal fires. The mock only
        // does so when a test did not ask it to misbehave.
        signal.addEventListener("abort", () => answer.reject(signal.reason), {
          once: true,
        });
      }
      if (options.hold === true) {
        return answer.promise;
      }
      answer.resolve(build(request));
      return answer.promise;
    },
  });

  return { adapter, requests };
};
