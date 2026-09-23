import type { MockSearchAdapterOptions } from "src/mock/types/MockSearchAdapterOptions";
import type { MockSearchRequest } from "src/mock/types/MockSearchRequest";
import type { MockSearchResponse } from "src/mock/types/MockSearchResponse";
import type { SearchAdapter } from "src/types/SearchAdapter";
import { createDeferred } from "src/utils/internal/createDeferred";

const getEmptyResponse = (): MockSearchResponse => ({
  hits: [],
  total: { value: 0, accuracy: "exact", scope: "matches" },
  facets: {},
  took: null,
  native: null,
});

/**
 * A controllable adapter for tests. It records every request, and lets a test
 * hold answers, settle them out of order, ignore cancellation or refuse.
 *
 * @example
 * ```ts
 * const mock = createMockSearchAdapter({ hold: true });
 * const scout = new Scout({ indexes: { products }, adapters: { products: mock.adapter } });
 * const pending = scout.index("products").search("shoe").execute();
 * mock.requests[0]?.settle(response);
 * ```
 */
export const createMockSearchAdapter = (
  options: MockSearchAdapterOptions = {},
) => {
  const requests: MockSearchRequest[] = [];
  let disposals = 0;

  const adapter: SearchAdapter<
    { readonly requests: readonly MockSearchRequest[] },
    Readonly<Record<string, unknown>>
  > = {
    name: "mock",
    native: { requests },
    fingerprint: () => options.fingerprint ?? "mock",
    sorts: options.sorts,
    profiles: options.profiles,
    reservedOptions: options.reservedOptions,
    search: (request, { signal }) => {
      const answer = createDeferred<MockSearchResponse>();

      requests.push({
        request,
        aborted: () => signal.aborted,
        settle: answer.resolve,
        fail: answer.reject,
      });

      // A well behaved SDK rejects as soon as the signal fires. The mock does
      // so unless a test asked it to misbehave.
      if (options.ignoreSignal !== true) {
        signal.addEventListener("abort", () => answer.reject(signal.reason), {
          once: true,
        });
      }

      if (options.hold === true) {
        return answer.promise;
      }

      if (typeof options.response !== "function") {
        answer.resolve(getEmptyResponse());

        return answer.promise;
      }

      try {
        answer.resolve(options.response(request));
      } catch (error) {
        answer.reject(error);
      }

      return answer.promise;
    },
    dispose: () => {
      disposals += 1;
    },
  };

  return { adapter, requests, disposals: () => disposals };
};
