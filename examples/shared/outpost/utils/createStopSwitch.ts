/**
 * The store's Stop button: a signal to hand each search, and a way to abort
 * the current one and arm a fresh signal for the next.
 *
 * @example
 * ```ts
 * const stop = createStopSwitch();
 * search.execute({ signal: stop.getSignal() });
 * stop.stop(); // the search rejects as aborted
 * ```
 */
export const createStopSwitch = () => {
  let controller = new AbortController();

  return {
    getSignal: () => controller.signal,
    stop: () => {
      controller.abort();
      controller = new AbortController();
    },
  };
};
