// Keep object variants readable without masking the error on circular values.
const getDescription = (value: never): string => {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
};

/**
 * Closes a union dispatch with a compile error for an unhandled variant.
 *
 * @example
 * ```ts
 * const label = (state: "ready" | "pending") => {
 *   if (state === "ready") { return "Ready"; }
 *   if (state === "pending") { return "Pending"; }
 *   return assertUnreachable(state);
 * };
 * ```
 */
export const assertUnreachable = (value: never): never => {
  throw new Error(`Unexpected value: ${getDescription(value)}`);
};
