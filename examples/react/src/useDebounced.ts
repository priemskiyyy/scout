import { useEffect, useState } from "react";

/**
 * Holds a value back until it stops changing.
 *
 * Debouncing lives here rather than in Scout: the library does not own the
 * keystroke, and a builder is free to rebuild on every one of them because
 * nothing is sent until `execute()`. What the application decides is when the
 * text is worth searching for.
 */
export const useDebounced = <TValue>(
  value: TValue,
  milliseconds: number,
): TValue => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), milliseconds);
    return () => clearTimeout(timer);
  }, [value, milliseconds]);

  return debounced;
};
