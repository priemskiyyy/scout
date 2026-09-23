import type { AdapterSort } from "@priemskiyyy/scout";

const getFieldValue = (document: unknown, field: string): unknown => {
  if (typeof document !== "object" || document === null) {
    return undefined;
  }

  return Object.getOwnPropertyDescriptor(document, field)?.value;
};

// Numbers, then strings, then everything else, a missing field included, so a
// value that has no order sorts last whichever way the sort runs.
const getRank = (value: unknown) => {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return 0;
  }

  if (typeof value === "string") {
    return 1;
  }

  return 2;
};

const getOrder = <TValue extends number | string>(
  left: TValue,
  right: TValue,
) => {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
};

// Strings compare by code unit rather than by locale, so the order is the same
// on every runtime.
const getValueOrder = (left: unknown, right: unknown) => {
  if (typeof left === "number" && typeof right === "number") {
    return getOrder(left, right);
  }

  if (typeof left === "string" && typeof right === "string") {
    return getOrder(left, right);
  }

  return 0;
};

const compareDocuments = (
  by: AdapterSort["by"],
  left: unknown,
  right: unknown,
) => {
  for (const { field, direction } of by) {
    const leftValue = getFieldValue(left, field);
    const rightValue = getFieldValue(right, field);
    const rank = getRank(leftValue) - getRank(rightValue);

    if (rank !== 0) {
      return rank;
    }

    const order = getValueOrder(leftValue, rightValue);

    if (order === 0) {
      continue;
    }

    if (direction === "asc") {
      return order;
    }

    return -order;
  }

  return 0;
};

/**
 * Every match in the order of one of the index's sorts, or in MiniSearch's
 * own relevance order when there is none. The sort is stable, so a tie keeps
 * that order.
 *
 * @example
 * ```ts
 * getSortedMatches(matches, { name: "priceAsc", by: [{ field: "price", direction: "asc" }] });
 * ```
 */
export const getSortedMatches = <TMatch extends { readonly document: unknown }>(
  matches: readonly TMatch[],
  sort: AdapterSort | null,
): readonly TMatch[] => {
  if (sort === null) {
    return matches;
  }

  return [...matches].sort((left, right) =>
    compareDocuments(sort.by, left.document, right.document),
  );
};
