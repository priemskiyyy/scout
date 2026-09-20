import { SearchConfigurationError } from "src/errors/SearchConfigurationError";
import { SearchDisposedError } from "src/errors/SearchDisposedError";
import { SearchValidationError } from "src/errors/SearchValidationError";
import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import { canonicalize } from "src/utils/internal/canonicalize";
import type { IndexRuntime } from "src/utils/internal/IndexRuntime";
import { checkCapabilities } from "src/utils/internal/checkCapabilities";
import { mapSearchResponse } from "src/utils/internal/mapSearchResponse";

const refuseProviderOptions = <TOptions, TDocument>(
  runtime: IndexRuntime<TOptions, TDocument>,
  provider: unknown,
): void => {
  if (provider === null) {
    return;
  }
  // Execution must reject options that cannot participate in query identity.
  canonicalize(provider, "provider");
  if (typeof provider !== "object") {
    return;
  }
  for (const key of Object.keys(provider)) {
    if (!runtime.adapter.reservedOptions.includes(key)) {
      continue;
    }
    throw new SearchConfigurationError({
      path: `provider.${key}`,
      message:
        `${key} is owned by Scout on the ${runtime.adapter.name} adapter, so a ` +
        `provider option cannot set it. Use the builder for it, or reach the ` +
        `SDK directly through the index's native handle.`,
    });
  }
};

/** Validates a request before dispatch, then maps the adapter response. */
export const executeSearch = async <TOptions, TDocument>(
  runtime: IndexRuntime<TOptions, TDocument>,
  request: AdapterSearchRequest<TOptions>,
  signal: AbortSignal,
) => {
  if (runtime.isDisposed()) {
    throw new SearchDisposedError({
      index: request.index,
      message: `The index ${request.index} was disposed.`,
    });
  }
  if (request.query.length === 0 && runtime.emptyQuery === "reject") {
    throw new SearchValidationError({
      index: request.index,
      issues: ["The query was empty."],
      message:
        `The index ${request.index} does not accept an empty query. Set ` +
        `emptyQuery: "allow" on the index, or skip the search while the input ` +
        `is empty.`,
    });
  }
  refuseProviderOptions(runtime, request.provider);
  checkCapabilities({ adapter: runtime.adapter, request });

  // A monotonic clock keeps wall-clock corrections out of elapsed time.
  const startedAt = performance.now();
  const response = await runtime.adapter.search(request, { signal });

  return mapSearchResponse({
    runtime,
    request,
    response,
    elapsed: performance.now() - startedAt,
  });
};
