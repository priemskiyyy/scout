/** The value once it has held still for `delay`, so typing sends one search. */
export const useDebounced = <T>(getValue: () => T, delay: number) => {
  let settled = $state(getValue());

  $effect(() => {
    const next = getValue();

    const timer = setTimeout(() => {
      settled = next;
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  });

  return {
    get current() {
      return settled;
    },
  };
};
