import { createEffect, createSignal, onCleanup } from "solid-js";
import type { Accessor } from "solid-js";

/** The value once it has held still for `delay`, so typing sends one search. */
export const useDebouncedValue = <T>(
  value: Accessor<T>,
  delay: number,
): Accessor<T> => {
  const [settled, setSettled] = createSignal(value());

  createEffect(() => {
    const next = value();

    const timer = setTimeout(() => {
      setSettled(() => next);
    }, delay);

    onCleanup(() => {
      clearTimeout(timer);
    });
  });

  return settled;
};
