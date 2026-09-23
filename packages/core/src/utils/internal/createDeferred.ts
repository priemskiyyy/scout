/** A promise with its settlement handed back, so a test can hold an answer. */
export const createDeferred = <TValue>() => {
  let resolve: (value: TValue) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;

  const promise = new Promise<TValue>((resolveWith, rejectWith) => {
    resolve = resolveWith;
    reject = rejectWith;
  });

  return { promise, resolve, reject };
};
