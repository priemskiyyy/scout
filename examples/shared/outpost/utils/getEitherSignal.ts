/**
 * A signal that aborts when either of two does, with the first one's reason.
 * `AbortSignal.any` does this, but not every runtime the examples run on has
 * it yet, so this is the same thing by hand.
 *
 * @example
 * ```ts
 * search.execute({ signal: getEitherSignal(tanstackSignal, stopSignal) });
 * ```
 */
export const getEitherSignal = (first: AbortSignal, second: AbortSignal) => {
  const controller = new AbortController();

  const handleAbort = (source: AbortSignal) => () => {
    controller.abort(source.reason);
  };

  if (first.aborted) {
    controller.abort(first.reason);

    return controller.signal;
  }

  if (second.aborted) {
    controller.abort(second.reason);

    return controller.signal;
  }

  first.addEventListener("abort", handleAbort(first), { once: true });
  second.addEventListener("abort", handleAbort(second), { once: true });

  return controller.signal;
};
