import { ScoutError } from "@priemskiyyy/scout";
import type { SearchAdapter } from "@priemskiyyy/scout";

import { formatError } from "examples/shared/outpost/formatting/formatError";
import type { EngineId } from "examples/shared/outpost/types/EngineId";
import type { TimelineEvent } from "examples/shared/outpost/types/TimelineEvent";

const getFailure = (
  engine: EngineId,
  query: string,
  error: unknown,
  signal: AbortSignal,
): TimelineEvent => {
  if (signal.aborted) {
    return { kind: "aborted", engine, query };
  }

  if (error instanceof ScoutError && error.code === "unsupported-feature") {
    return { kind: "refused", engine, query, message: error.message };
  }

  return { kind: "failed", engine, query, message: formatError(error) };
};

/**
 * The same adapter, telling the timeline when a search reaches it and how it
 * ends. An adapter is a plain object, so wrapping one is a spread: nothing
 * about it changes but `search`.
 *
 * @example
 * ```ts
 * const traced = traceAdapter("orama", orama({ db, search, revision }), timeline.add);
 * ```
 */
export const traceAdapter = <TNative, TOptions, THit, TResponse>(
  engine: EngineId,
  adapter: SearchAdapter<TNative, TOptions, THit, TResponse>,
  record: (event: TimelineEvent) => void,
): SearchAdapter<TNative, TOptions, THit, TResponse> => ({
  ...adapter,
  search: async (request, context) => {
    const started = performance.now();
    const { query } = request;

    record({ kind: "sent", engine, query });

    try {
      const response = await adapter.search(request, context);
      const duration = Math.round(performance.now() - started);

      // The caller already has its answer: Scout settled it on the abort.
      if (context.signal.aborted) {
        record({ kind: "orphaned", engine, query, duration });

        return response;
      }

      record({
        kind: "answered",
        engine,
        query,
        duration,
        total: response.total,
      });

      return response;
    } catch (error) {
      record(getFailure(engine, query, error, context.signal));

      throw error;
    }
  },
});
