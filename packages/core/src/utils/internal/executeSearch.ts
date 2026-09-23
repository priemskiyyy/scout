import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import type { AdapterSearchResponse } from "src/types/AdapterSearchResponse";
import type { IndexRuntime } from "src/utils/internal/IndexRuntime";
import {
  getEmptySearchResult,
  mapSearchResponse,
} from "src/utils/internal/mapSearchResponse";
import { resolveSearch } from "src/utils/internal/resolveSearch";
import type { SearchState } from "src/utils/internal/SearchState";
import { ScoutError } from "src/utils/ScoutError";

const getDisposedError = (index: string, cause?: unknown) =>
  new ScoutError({
    code: "disposed",
    message: `The Scout serving ${index} was disposed.`,
    cause,
  });

const getAbortedError = (index: string, reason: unknown) =>
  new ScoutError({
    code: "aborted",
    message: `The search of ${index} was aborted.`,
    cause: reason,
  });

// An engine may ignore cancellation forever, so the caller's promise settles
// on abort or disposal whatever the adapter does, and a late failure is still
// observed by the race.
const callAdapter = async (
  runtime: IndexRuntime,
  request: AdapterSearchRequest<unknown>,
  caller: AbortSignal,
): Promise<AdapterSearchResponse<unknown, unknown>> => {
  const { adapter, closed, name } = runtime;
  const controller = new AbortController();
  const handleAbort = () => controller.abort(caller.reason);
  const handleClose = () => controller.abort(closed.reason);

  caller.addEventListener("abort", handleAbort, { once: true });
  closed.addEventListener("abort", handleClose, { once: true });

  const cancelled = new Promise<never>((_resolve, reject) => {
    controller.signal.addEventListener(
      "abort",
      () => reject(controller.signal.reason),
      { once: true },
    );
  });

  try {
    const response = await Promise.race([
      adapter.search(request, { signal: controller.signal }),
      cancelled,
    ]);

    if (closed.aborted) {
      throw getDisposedError(name);
    }

    if (caller.aborted) {
      throw getAbortedError(name, caller.reason);
    }

    return response;
  } catch (error) {
    if (closed.aborted) {
      throw getDisposedError(name, error);
    }

    if (caller.aborted) {
      throw getAbortedError(name, caller.reason);
    }

    if (error instanceof ScoutError) {
      throw error;
    }

    throw new ScoutError({
      code: "provider",
      message: `The ${adapter.name} search of ${name} failed.`,
      cause: error,
    });
  } finally {
    caller.removeEventListener("abort", handleAbort);
    closed.removeEventListener("abort", handleClose);
  }
};

/**
 * Resolves a search, answers a contradiction without the engine, and
 * otherwise dispatches it and maps the answer.
 */
export const executeSearch = async (
  runtime: IndexRuntime,
  state: SearchState,
  signal: AbortSignal | undefined,
) => {
  if (runtime.closed.aborted) {
    throw getDisposedError(runtime.name);
  }

  const caller = signal ?? new AbortController().signal;

  if (caller.aborted) {
    throw getAbortedError(runtime.name, caller.reason);
  }

  const { request, filter } = resolveSearch(runtime, state);
  // A monotonic clock keeps wall-clock corrections out of elapsed time.
  const startedAt = performance.now();

  if (filter === false) {
    return getEmptySearchResult(request, performance.now() - startedAt);
  }

  const response = await callAdapter(runtime, request, caller);

  return mapSearchResponse({
    runtime,
    request,
    response,
    elapsed: performance.now() - startedAt,
  });
};
