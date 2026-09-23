/**
 * How two field values order: negative when the first comes first, positive
 * when it comes last, and zero for a tie or for values of different types.
 * Strings compare by code unit, so an order never depends on the runtime's
 * locale.
 *
 * @example
 * ```ts
 * getOrderOfValues(90, 140); // -50
 * ```
 */
export const getOrderOfValues = (left: unknown, right: unknown): number => {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }

  if (typeof left !== "string" || typeof right !== "string") {
    return 0;
  }

  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
};
