import { createSubscriber } from "svelte/reactivity";

/** Svelte's counterpart of React's `useSyncExternalStore`, read through `current`. */
export const useExternalStore = <T>(
  subscribe: (listener: () => void) => () => void,
  getSnapshot: () => T,
): { readonly current: T } => {
  const track = createSubscriber(subscribe);

  return {
    get current() {
      track();

      return getSnapshot();
    },
  };
};
