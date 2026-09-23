import { useEffect, useState } from "react";

/** The value once it has held still for `delay`, so typing sends one search. */
export const useDebouncedValue = <T>(value: T, delay: number) => {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSettled(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return settled;
};
