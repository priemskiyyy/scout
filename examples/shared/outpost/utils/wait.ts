/**
 * Resolves after `milliseconds`, or rejects with the signal's reason the
 * moment it aborts, the way `fetch` does. Without a signal it always waits.
 */
export const wait = (milliseconds: number, signal: AbortSignal | null) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(signal.reason);

      return;
    }

    const handleAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, milliseconds);

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
