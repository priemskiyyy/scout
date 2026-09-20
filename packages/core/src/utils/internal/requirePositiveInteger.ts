import { SearchConfigurationError } from "src/errors/SearchConfigurationError";

/**
 * Refuses a page or page size that cannot mean anything.
 *
 * Scout pages are one-based, so zero, a negative number and a fraction are all
 * programming mistakes. They are refused at the call site rather than
 * translated, because an adapter over a zero-based engine would turn page 0
 * into page -1 and ask the provider to explain it.
 */
export const requirePositiveInteger = (
  path: "page" | "pageSize",
  value: number,
): number => {
  if (Number.isInteger(value) && value > 0) {
    return value;
  }
  throw new SearchConfigurationError({
    path,
    message:
      `${path} must be a whole number greater than zero, and ${value} is not. ` +
      `Scout pages are one-based.`,
  });
};
