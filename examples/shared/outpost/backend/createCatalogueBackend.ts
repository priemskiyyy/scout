import type { HttpRequest } from "@priemskiyyy/scout-http";

import { answerSearch } from "examples/shared/outpost/backend/answerSearch";
import {
  HOSTILE_PRODUCT,
  PRODUCTS,
} from "examples/shared/outpost/constants/products";
import type { BackendState } from "examples/shared/outpost/types/BackendState";
import type { CatalogueBackend } from "examples/shared/outpost/types/CatalogueBackend";
import type { NetworkRequest } from "examples/shared/outpost/types/NetworkRequest";
import type { Product } from "examples/shared/outpost/types/Product";
import type { RequestOutcome } from "examples/shared/outpost/types/RequestOutcome";
import { createEventLog } from "examples/shared/outpost/utils/createEventLog";
import { createValueStore } from "examples/shared/outpost/utils/createValueStore";
import { wait } from "examples/shared/outpost/utils/wait";

type CatalogueBackendOptions = { latency: number };

const getCorpus = (state: BackendState): readonly Product[] => {
  if (state.hostileDocument) {
    return [HOSTILE_PRODUCT, ...PRODUCTS];
  }

  return PRODUCTS;
};

// A request that ran to the end after its caller left is still an answer,
// only one nobody reads.
const getAnsweredOutcome = (signal: AbortSignal): RequestOutcome => {
  if (signal.aborted) {
    return "orphaned";
  }

  return "answered";
};

/**
 * Your API, running inside the page. The HTTP adapter reaches it through the
 * client the application hands it, and every request it receives lands in
 * `requests`, newest first. The lab changes how it answers through `update`.
 *
 * @example
 * ```ts
 * const backend = createCatalogueBackend({ latency: 400 });
 * const adapter = http({ fingerprint: "outpost-api/v1", request: backend.search });
 * ```
 */
export const createCatalogueBackend = ({
  latency,
}: CatalogueBackendOptions): CatalogueBackend => {
  const state = createValueStore<BackendState>({
    latency,
    counting: "exact",
    facetCounting: "every",
    paging: "every",
    offline: false,
    refuseHighlights: false,
    corruptDocument: false,
    hostileDocument: false,
    ignoreAborts: false,
  });

  const requests = createEventLog<NetworkRequest>(40);
  const inFlight = createValueStore(0);
  const failNext = createValueStore(false);
  let nextId = 1;

  const update = (patch: Partial<BackendState>) => {
    state.set({ ...state.get(), ...patch });
  };

  const record = (
    search: HttpRequest["search"],
    started: number,
    outcome: RequestOutcome,
    status: number | null,
    hits: number | null,
  ) => {
    requests.add({
      id: nextId,
      at: Date.now(),
      search,
      outcome,
      status,
      duration: Math.round(performance.now() - started),
      hits,
    });
    nextId += 1;
  };

  const searchCatalogue: CatalogueBackend["search"] = async ({
    search,
    signal,
  }) => {
    const started = performance.now();
    const current = state.get();

    inFlight.set(inFlight.get() + 1);

    try {
      // A client that does not pass the signal on leaves the server working
      // for a caller that already left.
      if (current.ignoreAborts) {
        await wait(current.latency, null);
      } else {
        await wait(current.latency, signal);
      }

      if (current.offline || failNext.get()) {
        failNext.set(false);
        record(search, started, "failed", 503, null);

        throw new Error("Your API answered 503 Service Unavailable.");
      }

      const answer = answerSearch(search, getCorpus(current), current);

      if ("refusal" in answer) {
        record(search, started, "refused", 422, null);

        return answer;
      }

      record(
        search,
        started,
        getAnsweredOutcome(signal),
        200,
        answer.hits.length,
      );

      return answer;
    } catch (error) {
      if (signal.aborted && !current.ignoreAborts) {
        record(search, started, "aborted", null, null);
      }

      throw error;
    } finally {
      inFlight.set(inFlight.get() - 1);
    }
  };

  return {
    state,
    requests: requests.log,
    inFlight,
    failNext,
    update,
    search: searchCatalogue,
  };
};
