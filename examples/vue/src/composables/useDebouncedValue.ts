import { onScopeDispose, shallowRef, watch } from "vue";

/** The value once it has held still for `delay`, so typing sends one search. */
export const useDebouncedValue = <T>(source: () => T, delay: number) => {
  const settled = shallowRef(source());
  let timer: ReturnType<typeof setTimeout> | undefined;

  watch(source, (value) => {
    clearTimeout(timer);

    timer = setTimeout(() => {
      settled.value = value;
    }, delay);
  });

  onScopeDispose(() => {
    clearTimeout(timer);
  });

  return settled;
};
