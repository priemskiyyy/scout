import { SearchAbortedError } from "src/errors/SearchAbortedError";
import { SearchDisposedError } from "src/errors/SearchDisposedError";
import { SearchProviderError } from "src/errors/SearchProviderError";
import { ScoutError } from "src/errors/ScoutError";
import type { AdapterSearchResponse } from "src/types/AdapterSearchResponse";
import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import type { SearchAdapterDefinition } from "src/types/SearchAdapterDefinition";

/**
 * Wraps a provider mapping with cancellation, idempotent disposal and error
 * conversion. Aborting rejects promptly even when the provider never settles.
 *
 * Infer type arguments from the definition to retain sort and profile names,
 * provider options, and native result types.
 *
 * @example
 * ```ts
 * export const provider = (options: ProviderOptions) =>
 *   createSearchAdapter({
 *     name: "provider",
 *     native: options.client,
 *     capabilities,
 *     sorts: options.sorts,
 *     profiles: options.profiles,
 *     fingerprint: () => options.collection,
 *     search: async (request, { signal }) => translate(await call(request, signal)),
 *   });
 * ```
 */
export const createSearchAdapter = <
  TDefinition extends Omit<SearchAdapterDefinition, "search">,
  TResponse extends AdapterSearchResponse,
  TOptions = never,
>(
  definition: TDefinition & {
    search: (
      request: AdapterSearchRequest<TOptions>,
      context: { signal: AbortSignal },
    ) => Promise<TResponse>;
  },
) => {
  const { search, dispose, reservedOptions = [], ...adapter } = definition;
  let disposed = false;
  const pending = new Set<() => void>();

  const refuseDisposed = (index: string) =>
    new SearchDisposedError({
      index,
      message: `The ${adapter.name} adapter for ${index} was disposed.`,
    });

  const refuseAborted = (reason: unknown) =>
    new SearchAbortedError({
      adapter: adapter.name,
      cancellation: adapter.capabilities.cancellation,
      message:
        adapter.capabilities.cancellation === "transport"
          ? `The ${adapter.name} search was aborted.`
          : `The ${adapter.name} search was abandoned. The engine cannot be ` +
            `cancelled, so it may still be running.`,
      cause: reason,
    });

  return {
    ...adapter,
    reservedOptions,
    search: async (
      request: AdapterSearchRequest<TOptions>,
      context: { signal: AbortSignal },
    ) => {
      if (disposed) {
        throw refuseDisposed(request.index);
      }
      // An already aborted signal never fires a listener, so the cheapest
      // cancellation is the one that never reaches the provider.
      if (context.signal.aborted) {
        throw refuseAborted(context.signal.reason);
      }
      let handleAbort = () => {};
      let handleDispose = () => {};
      const cancelled = new Promise<never>((_resolve, reject) => {
        handleAbort = () => reject(refuseAborted(context.signal.reason));
        handleDispose = () => reject(refuseDisposed(request.index));
        context.signal.addEventListener("abort", handleAbort, { once: true });
        pending.add(handleDispose);
      });
      const runSearch = async () => search.call(definition, request, context);
      try {
        // The provider may ignore cancellation forever. Racing settles the
        // caller's promise promptly and still observes a late SDK rejection.
        const response = await Promise.race([cancelled, runSearch()]);
        if (disposed) {
          throw refuseDisposed(request.index);
        }
        if (context.signal.aborted) {
          throw refuseAborted(context.signal.reason);
        }
        return response;
      } catch (error) {
        if (disposed) {
          throw refuseDisposed(request.index);
        }
        if (context.signal.aborted) {
          throw refuseAborted(context.signal.reason);
        }
        if (error instanceof ScoutError) {
          throw error;
        }
        throw new SearchProviderError({
          adapter: adapter.name,
          message: `The ${adapter.name} search of ${request.index} failed.`,
          cause: error,
        });
      } finally {
        context.signal.removeEventListener("abort", handleAbort);
        pending.delete(handleDispose);
      }
    },
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      for (const handleDispose of pending) {
        handleDispose();
      }
      pending.clear();
      if (typeof dispose === "function") {
        dispose.call(definition);
      }
    },
  };
};
